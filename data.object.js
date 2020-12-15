"use strict";

/**
 * Data Acess Layer Object
 * Fetches data from opentransportdata.swiss API
 *
 */


let data = {
	config: {},

    url: "https://api.opentransportdata.swiss/trias2020",
	requestString: '<?xml version="1.0" encoding="UTF-8"?> <Trias version="1.1" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> <ServiceRequest> <siri:RequestTimestamp>2016-06-27T13:34:00</siri:RequestTimestamp> <siri:RequestorRef>EPSa</siri:RequestorRef> <RequestPayload> <StopEventRequest> <Location> <LocationRef> <StopPointRef></StopPointRef> </LocationRef> <DepArrTime> </DepArrTime> </Location> <Params> <NumberOfResults></NumberOfResults> <StopEventType></StopEventType> <IncludePreviousCalls>true</IncludePreviousCalls> <IncludeOnwardCalls>true</IncludeOnwardCalls> <IncludeRealtimeData>true</IncludeRealtimeData> </Params> </StopEventRequest> </RequestPayload> </ServiceRequest> </Trias>',

	prefix: "trias:",

	apiKey: "",

	trains: [],						// Array of train objects, each item holds a train arriving and/or leaving at the selected station

	departuresDataTmp: 0,
	arrivalsDataTmp: 0,

	/**
	 * Set user configuration
	 *
	 * @param config - Properties: string station, array transportations, int limit
	 */
    setConfig: function (config) {
	    config.transportations.push("Extrazug");                    // never filter out Extrazug

	    // if(config.transportations.indexOf("S-Bahn") !== -1) {       // "S-Bahn" is called "S" sometimes, so add "S" too if "S-Bahn" is present
	    //     config.transportations.push("S");
        // }
		//
        // if(config.transportations.indexOf("Intercity") !== -1) {    // same with IC & Intercity, might not be useful data!
	    //     config.transportations.push("IC");
        // }
		//
		// if(config.transportations.indexOf("Eurocity") !== -1) {    // same with EC & Eurocity, probably not useful data
		// 	config.transportations.push("EC");
		// }

	    this.config = config;
    },

	/**
	 * Genereate request and load data from api
	 * Arrival and departure data gets loaded simultaniously, when both has been loaded parse() gets called
	 *
	 */
	load: async function () {
		if(this.apiKey.length === 0) {
			console.log("No API Key specified!")
			return false;
		}

		let arrivalsPromise = this.loadData("arrival");
		let departurePromise = this.loadData("departure");

		let results = await Promise.allSettled([arrivalsPromise, departurePromise]);  // synchronize

		let trains = this.merge(results[0].value, results[1].value);

		trains = trains.filter(this.isDepartureInThePast);       // filter out trains which left the station
		trains = trains.filter(this.checkType.bind(this));     // filter by train types

		this.trains = trains;
    },

	loadData: async function (type) {
		let that = this;

		let parser = new DOMParser();

		// build arrivals request
		let request = parser.parseFromString(that.requestString, "text/xml");
		request.getElementsByTagName("StopPointRef")[0].innerHTML = that.config.station;
		request.getElementsByTagName("StopEventType")[0].innerHTML = type;
		request.getElementsByTagName("NumberOfResults")[0].innerHTML = that.config.limit;

		request.getElementsByTagName("DepArrTime")[0].innerHTML = this.getLocalIsoTime();

		let serializer = new XMLSerializer();

		let response = await fetch(that.url, {
			method: "POST",
			headers: {
				'Authorization': that.apiKey,
				'Content-Type': 'application/xml',
			},
			body: serializer.serializeToString(request),
		});
 		let data = await response.text()
		return this.parse(parser.parseFromString(data, "text/xml"));
	},

	// set time of request to now()
	getLocalIsoTime: function () {
		let timezoneOffset = (new Date()).getTimezoneOffset() * 60000; // timezone offset in milliseconds
		return (new Date(Date.now() - timezoneOffset)).toISOString().substr(0, 19);
	},

	/**
	 * Parse API Data from XML to train object array trains
	 *
	 *
	 */
    parse: function (data) {
		let trains = [];

		let stopEventResults= data.getElementsByTagName(this.prefix + "StopEventResult");
		for(let i=0;i<stopEventResults.length;i++) {
            let train = {};
            this.parseService(stopEventResults[i].getElementsByTagName(this.prefix + "Service")[0], train);
            this.parseThisCall(stopEventResults[i].getElementsByTagName(this.prefix + "ThisCall")[0],train);		// current stop
            train.fromPasslist = this.parsePasslist(stopEventResults[i].getElementsByTagName(this.prefix + "PreviousCall"));	// from passlist (PreviousCall)
            train.toPasslist = this.parsePasslist(stopEventResults[i].getElementsByTagName(this.prefix + "OnwardCall"));		// to passlist (OnwardCall)

            trains.push(train);
        }
		return trains;
    },

	/**
	 * Parse service xml structure to train object
	 * Service: https://opentransportdata.swiss/de/cookbook/service-vdv-431/
	 * Mode: https://opentransportdata.swiss/de/cookbook/ptmode/
	 *
	 * @param service - service xml structure to be parsed
	 * @param train - train object to be populated
	 */
	parseService: function (service, train) {
        train.lineRef = service.getElementsByTagName(this.prefix + "LineRef")[0].textContent;
        train.journeyRef = service.getElementsByTagName(this.prefix + "JourneyRef")[0].textContent;

        let mode = service.getElementsByTagName(this.prefix + "Mode")[0];

        let modeName = mode.getElementsByTagName(this.prefix + "Name")[0].firstChild.textContent.split(" ");
        train.type = modeName[0];
        train.from = service.getElementsByTagName(this.prefix + "OriginText")[0].firstChild.textContent;
        train.to = service.getElementsByTagName(this.prefix + "DestinationText")[0].firstChild.textContent;

        let cancelled = service.getElementsByTagName(this.prefix + "Cancelled")[0];
        if(cancelled !== undefined) {
            if(cancelled.textContent === "true") {
                train.cancelled = true;
                console.log("parseService: ", train.from, train.to,"cancelled");
            } else {
                train.cancelled = false; // debug
            }
        }

        let unplanned = service.getElementsByTagName(this.prefix + "Unplanned")[0];
        if(unplanned !== undefined) {
            if (unplanned.textContent === "true") {
                train.unplanned = true;
                console.log("parseService:",train.from, train.to,"unplanned");
            } else {
                train.unplanned = false;
            }
        }
    },

	/**
	 * Parse thisCall XML structure to train object
	 *
	 * @param thisCall - xml structure to be parsed
	 * @param train - train object to be populated
	 */
	parseThisCall: function (thisCall, train) {
		let serviceArrival, serviceDeparture;
		let plannedBay,estimatedBay, estimatedTime;

        plannedBay = thisCall.getElementsByTagName(this.prefix + "PlannedBay")[0];
        if (plannedBay !== undefined) {
            train.platform = plannedBay.getElementsByTagName(this.prefix + "Text")[0].textContent;
        } else {
			delete train.platform;
        }

        estimatedBay = thisCall.getElementsByTagName(this.prefix + "EstimatedBay")[0];
        if (estimatedBay !== undefined) {
            train.platform = estimatedBay.getElementsByTagName(this.prefix + "Text")[0].textContent;
            train.changedPlatform = true;
        }

        serviceArrival = thisCall.getElementsByTagName(this.prefix + "ServiceArrival")[0];
        serviceDeparture = thisCall.getElementsByTagName(this.prefix + "ServiceDeparture")[0];


        if(serviceArrival !== undefined) {
            train.arrivalTime = new Date(serviceArrival.getElementsByTagName(this.prefix + "TimetabledTime")[0].textContent);
			estimatedTime =  serviceArrival.getElementsByTagName(this.prefix + "EstimatedTime")[0];
            if (estimatedTime !== undefined) {
				train.estimatedArrivalTime = new Date(estimatedTime.textContent);
			}
		}

        if(serviceDeparture !== undefined) {
            train.departureTime = new Date(serviceDeparture.getElementsByTagName(this.prefix + "TimetabledTime")[0].textContent);
			estimatedTime = serviceDeparture.getElementsByTagName(this.prefix + "EstimatedTime")[0];
            if (estimatedTime !== undefined) {
				train.estimatedDepartureTime = new Date(estimatedTime.textContent);
			}
		}



    },

	/**
	 *
	 * Parse PreviousCall and OnwardCall XML structure to array of stops
	 *
	 * @param passlist - PreviousCall or OnwardCall XML structure
	 * @returns {Array} - String array of stops
	 */
	parsePasslist: function (passlist) {
        let passlistFormat = [];

        for(let i=0;i<passlist.length;i++) {
            passlistFormat.push(passlist[i].getElementsByTagName(this.prefix + "StopPointName")[0].firstChild.textContent);
        }
        return passlistFormat;
    },

	/**
	 *
	 * Merge arrivalTrains and departureTrains arrays to trains property array
	 *
	 * @param arrivalTrains -  array of arriving trains
	 * @param departureTrains - array of departing trains
	 */
	merge: function (arrivalTrains, departureTrains) {
		const that = this;

		let mergedTrains = [];
        let mergedTrain;
        let departingTrain;

        arrivalTrains.forEach(function(arrivingTrain) {
			mergedTrain = arrivingTrain;
			mergedTrain.arrivingCancelled = mergedTrain.cancelled;
			delete mergedTrain.cancelled;

			// search departing trains for journeyReference of arriving train
            let departingTrainIndex = departureTrains.findIndex(function(departingTrain) {
                return departingTrain.journeyRef === arrivingTrain.journeyRef;
            });

            if(departingTrainIndex !== -1) {                        // when corresponding train found
				departingTrain = departureTrains[departingTrainIndex];
                mergedTrain.departureTime = departingTrain.departureTime;
				mergedTrain.estimatedDepartureTime = departingTrain.estimatedDepartureTime;
				mergedTrain.departureCancelled = departingTrain.cancelled;
                departureTrains.splice(departingTrainIndex,1);				// remove this train from departure trains
            }
			that.insertOrUpdate(mergedTrain, mergedTrains);
		});

        departureTrains.forEach(function (departureTrain) {                 // push remaining departing trains
			departureTrain.departureCancelled = departureTrain.cancelled;
			delete departureTrain.cancelled;

			that.insertOrUpdate(departureTrain, mergedTrains)
        });

		return mergedTrains;
    },

	insertOrUpdate: function(mergedTrain, mergedTrains) {
		const that = this;
		let foundTrain = that.trains.find(function (needle) {
			return mergedTrain.journeyRef === needle.journeyRef;
		});

		if (foundTrain === undefined) { 	// when train not yet in list
			mergedTrains.push(mergedTrain);
		} else {
			that.updateTrain(foundTrain, mergedTrain)
		}
	},

	/**
	 * Search for train object in this.trains with same journeyRef as parameter object train. If found update all available information
	 *
	 *
	 * @returns {boolean} - false if train not in array this.trains, else true
	 * @param receiverTrain
	 * @param updaterTrain
	 */
    updateTrain: function (receiverTrain, updaterTrain) {
    	let keys = ["arrivalTime", "departureTime", "arrivalDelay", "departureDelay", "cancelled", "changedPlatform", "platform"];

		keys.forEach( (key) => {
			if(updaterTrain[key] !== undefined) {
				receiverTrain[key] = updaterTrain[key];
			}
		})
    },

	/**
	 * check if departure time of train is in the past
	 *
	 * @param train
	 * @returns {boolean} - returns false if train can be removed from lilst
	 */
	isDepartureInThePast: function (train) {
		if (train !== undefined) {
			if(train.lock === true) {				// keep in list, when lock is set
				return true;
			}

			if(typeof train.estimatedDepartureTime === 'object') {
				if(train.estimatedDepartureTime < Date.now()) {
					return false;														// estimated departure time is set and in the past
				}
			} else {
				if (typeof train.departureTime === 'object' && train.departureTime < Date.now()) {
					return false;																			// regular departure time is set and in the past
				}
			}

			if (typeof train.departureTime === 'undefined') {						// no departure time set == train stays at station
				if(typeof train.estimatedArrivalTime === 'object') {
					if (train.estimatedArrivalTime < Date.now()) {
						return false;												// estimated arrival is set an in the past
					}
				} else {
					if (typeof train.arrivalTime === 'object'	&& train.arrivalTime < Date.now()) {
						return false;																		// regular arrival is set and in the past
					}
				}
			}
		}
		return true;
	},

	/**
	 *
	 * Filter helper function:
	 * Return true if
	 * 		- train.type is in array this.config.transportations
	 *		- train.lock is true
	 *
	 * function is used to filter by transportation types
	 *
	 * @param train - train object
	 * @returns {boolean}
	 */
	checkType: function (train) {
		const that = this;

		if(train.lock === true) {				// keep in list, when lock is set
			return true;
		}

        if(that.config.transportations.indexOf(train.type) === -1) {
            return true;
        } else {
            return true;
        }
    },

	/**
	 * Generate JSON Date from timestamp
	 *
	 * @param timestamp
	 * @returns {string} - JSON Datestring
	 */
	timestampToJson: function(timestamp) {
		let date = new Date(timestamp);			// generate date from earlies arrival time
		let offset = date.getTimezoneOffset()/60;			// get current timezone offset
			
		date.setHours(date.getHours()-offset);				// adjust date with offset
		
		return date.toJSON();				// set query date to earliest arrival date
	},


	/**
	 * Display error message and symbol
	 *
	 * @param jqXHR
	 */
	errorHandling: function(jqXHR) {
		const alert = document.getElementById("alert");
		alert.style.visibility = "visible";

        alert.getElementsByTagName("span")[0].text(jqXHR.statusText);

		console.log("errorHandling: ",jqXHR.statusText);
	},


	/**
	 *
	 * Set property lock to true in train object in this.trains with corresponding journeyRef property
	 *
	 * @param journeyRef
	 * @returns {boolean} - true if matching object found, else false
	 */
	lock: function(journeyRef) {
		const that = this;

		that.trains.forEach(function(train, index, array) {
			if(train.journeyRef === journeyRef) {
				train.lock = true;
				return true;
			}
		});
		return false;
	},

	/**
	 * Change property lock to false in train object in this.trains with corresponding journeyRef property
	 *
	 * @param journeyRef
	 * @returns {boolean} - true if matching object found, else false
	 */
	unlock: function(journeyRef) {
		const that = this;

		that.trains.forEach(function(train, index, array) {
			if(train.journeyRef === journeyRef) {
				train.lock = false;
				return true;
			}
		});
		return false;
	},
 };