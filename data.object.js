"use strict";

/**
 * Data Acess Layer Object
 * Fetches data from opentransportdata.swiss API
 * @author Fabian Hirter, fabian@berghirt.ch
 *
 */
var data = {
	config: {},

    url: "https://api.opentransportdata.swiss/trias",
	apiKey: "57c5dbbbf1fe4d0001000018e0c4735a94714ca964fad054340c4228",
	
	// arrivalTrains: [],
	// departureTrains: [],
	trains: [],						// Array of train objects, each item holds a train arriving and/or leaving at the selected station

	departuresDataTmp: 0,
	arrivalsDataTmp: 0,
    // requestTime: new Date(),


	/**
	 * Set configuration from user
	 *
	 * @param config - Properties: string station, array transportations, int limit
	 */
    setConfig: function (config) {
	    config.transportations.push("Extrazug");                    // never filter out Extrazug

	    if(config.transportations.indexOf("S-Bahn") !== -1) {       // "S-Bahn" is called "S" sometimes, so add "S" too if "S-Bahn" is present
	        config.transportations.push("S");
        }

        if(config.transportations.indexOf("Intercity") !== -1) {    // same with IC & Intercity, might not be useful data!
	        config.transportations.push("IC");
        }

		if(config.transportations.indexOf("Eurocity") !== -1) {    // same with EC & Eurocity, probably not useful data
			config.transportations.push("EC");
		}

	    this.config = config;
    },
	/**
	 * Genereate request and load data from api
	 * Arrival and departure data gets loaded simultaniously, when both has been loaded parse() gets called
	 * @param callback - callback function to be called when load is complete
	 * @param context - this context for callback function
	 *
	 */
	load: function (callback, context) {
		var that = this;
		var flag = 0;

		var requestString = '<?xml version="1.0" encoding="UTF-8"?> <Trias version="1.1" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> <ServiceRequest> <siri:RequestTimestamp>2016-06-27T13:34:00</siri:RequestTimestamp> <siri:RequestorRef>EPSa</siri:RequestorRef> <RequestPayload> <StopEventRequest> <Location> <LocationRef> <StopPointRef></StopPointRef> </LocationRef> <DepArrTime> </DepArrTime> </Location> <Params> <NumberOfResults></NumberOfResults> <StopEventType></StopEventType> <IncludePreviousCalls>true</IncludePreviousCalls> <IncludeOnwardCalls>true</IncludeOnwardCalls> <IncludeRealtimeData>true</IncludeRealtimeData> </Params> </StopEventRequest> </RequestPayload> </ServiceRequest> </Trias>';
		var parser = new DOMParser();
		var requestArr, requestDep, xhrArr,xhrDep;

		// build arrivals request
        requestArr = parser.parseFromString(requestString, "text/xml");
        requestArr.getElementsByTagName("StopPointRef")[0].innerHTML = that.config.station;
        requestArr.getElementsByTagName("StopEventType")[0].innerHTML = "arrival";
        requestArr.getElementsByTagName("NumberOfResults")[0].innerHTML = that.config.limit;

        // set time of request to now()
        var tzoffset = (new Date()).getTimezoneOffset() * 60000; // timezone offset in milliseconds
        var localISOTime = (new Date(Date.now() - tzoffset)).toISOString().substr(0,19);
        requestArr.getElementsByTagName("DepArrTime")[0].innerHTML = localISOTime;

        // set headers
        xhrArr = new XMLHttpRequest();
        xhrArr.open('POST', that.url);
        xhrArr.setRequestHeader('Authorization',that.apiKey);
        xhrArr.setRequestHeader('Content-Type','application/xml');
        xhrArr.addEventListener('load',function () {                                       // onload callback
            that.arrivalsDataTmp = this.responseXML;

            if(flag === 1) {								// departures already loaded
                that.parse();
				if (typeof(callback) === "function") {
					callback.call(context);
				}
                flag = 0;									// reset flag
            } else {
                flag = 1;
            }
        });
        xhrArr.addEventListener('error',function () {
            that.errorHandling(xhrArr);
        })
        xhrArr.send(requestArr);

		// build departures request
        requestDep = parser.parseFromString(requestString, "text/xml"); 				//important to use "text/xml"
        requestDep.getElementsByTagName("StopPointRef")[0].innerHTML = that.config.station;
        requestDep.getElementsByTagName("StopEventType")[0].innerHTML = "departure";
        requestDep.getElementsByTagName("NumberOfResults")[0].innerHTML = that.config.limit;
        requestDep.getElementsByTagName("DepArrTime")[0].innerHTML = localISOTime;

		// set headers
        xhrDep = new XMLHttpRequest();
        xhrDep.open('POST', that.url);
        xhrDep.setRequestHeader('Authorization',that.apiKey);
        xhrDep.setRequestHeader('Content-Type','application/xml');
        xhrDep.addEventListener('load',function () {						// onload callback
            that.departuresDataTmp = this.responseXML;

            if(flag === 1) {								// arrivals already loaded
                that.parse();
				if (typeof(callback) === "function") {
					callback.call(context);
				}
                flag = 0;									// reset flag
            } else {
                flag = 1;
            }
        });
        xhrDep.addEventListener('error',function () {
            that.errorHandling(xhrDep);
        })
        xhrDep.send(requestDep);
    },

	/**
	 * Parse API Data from XML to train object array trains
	 *
	 *
	 */
    parse: function () {


		var that = this;
        var i;
        var train;

        var stopEventResultsArrival= that.arrivalsDataTmp.getElementsByTagName("StopEventResult");
        var stopEventResultsDeparture= that.departuresDataTmp.getElementsByTagName("StopEventResult");

        var arrivalTrains = [];
		var departureTrains = [];

		// parse arrivals
        for(i=0;i<stopEventResultsArrival.length;i++) {
            train = {};																							// generate new train object todo: add default values through constructor
            that.parseService(stopEventResultsArrival[i].getElementsByTagName("Service")[0], train);
            that.parseThisCall(stopEventResultsArrival[i].getElementsByTagName("ThisCall")[0],train);		// current stop
            train.fromPasslist = that.parsePasslist(stopEventResultsArrival[i].getElementsByTagName("PreviousCall"));	// from passlist (PreviousCall)
            train.toPasslist = that.parsePasslist(stopEventResultsArrival[i].getElementsByTagName("OnwardCall"));		// to passlist (OnwardCall)

            arrivalTrains.push(train);
        }

        // parse departures
        for(i=0;i<stopEventResultsDeparture.length;i++) {
			train = {};																						// generate new train object
			that.parseService(stopEventResultsDeparture[i].getElementsByTagName("Service")[0],train);
            that.parseThisCall(stopEventResultsDeparture[i].getElementsByTagName("ThisCall")[0],train);		// current stop
            train.fromPasslist = that.parsePasslist(stopEventResultsDeparture[i].getElementsByTagName("PreviousCall"));	// from passlist (PreviousCall)
            train.toPasslist = that.parsePasslist(stopEventResultsDeparture[i].getElementsByTagName("OnwardCall"));		// to passlist (OnwardCall)

			departureTrains.push(train);
        }

        that.merge(arrivalTrains, departureTrains);

		that.trains = that.trains.filter(that.checkDepartureArrivalTimes);       // filter out trains which left the station

		that.trains = that.trains.filter(that.checkType.bind(that));     // filter by train types
    },

	/**
	 * Parse service xml structure to train object
	 *
	 *
	 * @param service - service xml structure to be parsed
	 * @param train - train object to be populated
	 */
	parseService: function (service, train) {
        var mode;

        var cancelled, unplanned;

        train.lineRef = service.getElementsByTagName("LineRef")[0].textContent;

        train.journeyRef = service.getElementsByTagName("JourneyRef")[0].textContent;

        mode = service.getElementsByTagName("Mode")[0];

        train.type = mode.getElementsByTagName("Name")[0].firstChild.textContent;


        train.from = service.getElementsByTagName("OriginText")[0].firstChild.textContent;
        train.to = service.getElementsByTagName("DestinationText")[0].firstChild.textContent;


        cancelled = service.getElementsByTagName("Cancelled")[0];
        if(cancelled !== undefined) {
            if(cancelled.textContent === "true") {
                train.cancelled = true;
                console.log("parseService: ", train.from, train.to,"cancelled");
            } else {
                train.cancelled = false; // debug
            }
        }

        unplanned = service.getElementsByTagName("Unplanned")[0];
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
	 *
	 * Parse thisCall XML structure to train object
	 *
	 * @param thisCall - xml structure to be parsed
	 * @param train - train object to be populated
	 */
	parseThisCall: function (thisCall, train) {
		var serviceArrival, serviceDeparture;
		var plannedBay,estimatedBay, estimatedTime;
		var prognoseMoeglich;

        plannedBay = thisCall.getElementsByTagName("PlannedBay")[0];
        if (plannedBay !== undefined) {
            train.platform = plannedBay.getElementsByTagName("Text")[0].textContent;
        } else {
			delete train.platform;
        }

        estimatedBay = thisCall.getElementsByTagName("EstimatedBay")[0];
        if (estimatedBay !== undefined) {
            train.platform = estimatedBay.getElementsByTagName("Text")[0].textContent;
            train.changedPlatform = true;
        }

        serviceArrival = thisCall.getElementsByTagName("ServiceArrival")[0];
        serviceDeparture = thisCall.getElementsByTagName("ServiceDeparture")[0];


        if(serviceArrival !== undefined) {
            train.arrivalTime = new Date(serviceArrival.getElementsByTagName("TimetabledTime")[0].textContent);
			estimatedTime =  serviceArrival.getElementsByTagName("EstimatedTime")[0];
            if (estimatedTime !== undefined) {
				train.estimatedArrivalTime = new Date(estimatedTime.textContent);
			}
		}

        if(serviceDeparture !== undefined) {
            train.departureTime = new Date(serviceDeparture.getElementsByTagName("TimetabledTime")[0].textContent);
			estimatedTime = serviceDeparture.getElementsByTagName("EstimatedTime")[0];
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
        var i;
        var passlistFormat = [];

        for(i=0;i<passlist.length;i++) {
            passlistFormat.push(passlist[i].getElementsByTagName("StopPointName")[0].firstChild.textContent);
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
        var trainMerged;
        var correspondingDepartingTrain;

        var that = this;

        arrivalTrains.forEach(function(trainArriving) {

            var correspondingDepartingTrainIndex = departureTrains.findIndex(function(train) {          			// search departing trains for journeyReference of arriving train
                return train.journeyRef === trainArriving.journeyRef;
            });

            trainMerged = trainArriving;
            trainMerged.arrivingCancelled = trainMerged.cancelled;
            delete trainMerged.cancelled;

            if(correspondingDepartingTrainIndex !== -1) {                        // when corresponding train found
				correspondingDepartingTrain = departureTrains[correspondingDepartingTrainIndex];
                trainMerged.departureTime = correspondingDepartingTrain.departureTime;		// add departure time
				trainMerged.estimatedDepartureTime = correspondingDepartingTrain.estimatedDepartureTime;		// add estimated departure time
				trainMerged.departureCancelled = correspondingDepartingTrain.cancelled;
                departureTrains.splice(correspondingDepartingTrainIndex,1);										// remove this element from departure trains
            }

            if(that.updateTrains(trainMerged) === false) {      // when train not yet in list
                that.trains.push(trainMerged);
            }
        });

        departureTrains.forEach(function (departureTrain) {                 // push remaining departing trains
			departureTrain.departureCancelled = departureTrain.cancelled;
			delete departureTrain.cancelled;

            if(that.updateTrains(departureTrain) === false) {                   // not yet in list
                that.trains.push(departureTrain);
            }
        });


    },

	/**
	 * check if departure time of train is in the past
	 *
	 * @param train
	 * @returns {boolean} - returns false if train can be removed from lilst
	 */
	checkDepartureArrivalTimes: function (train) {
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
	 * Search for train object in this.trains with same journeyRef as parameter object train. If found update all available information
	 *
	 *
	 * @param train - train object with new data
	 * @returns {boolean} - false if train not in array this.trains, else true
	 */
    updateTrains: function (train) {
        var that = this;
        var foundTrain;
		var foundTrainIndex = -1;

        that.trains.forEach(function(trainElement, index, array) {
			if(train.journeyRef === trainElement.journeyRef) {
				foundTrainIndex = index;
			}
		});

        if (foundTrainIndex === -1) {
			return false;
		} else {
            foundTrain =  that.trains[foundTrainIndex];

            if( train.arrivalTime !== undefined) {
				foundTrain.arrivalTime = train.arrivalTime;
			}
			if( train.departureTime !== undefined) {
				foundTrain.departureTime = train.departureTime;
			}
			if(train.arrivalDelay !== undefined) {
				foundTrain.arrivalDelay = train.arrivalDelay;
			}
			if(train.departureDelay !== undefined) {
				foundTrain.departureDelay = train.departureDelay;
			}
			if(train.cancelled !== undefined) {
				foundTrain.cancelled = train.cancelled;
			}
			if(train.changedPlatform !== undefined) {
				foundTrain.changedPlatform = train.changedPlatform;
			}
			if(train.platform !== undefined) {
				foundTrain.platform = train.platform;
			}
            return true;
        }
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
		var that = this;

		if(train.lock === true) {				// keep in list, when lock is set
			return true;
		}

        if(that.config.transportations.indexOf(train.type) === -1) {
            return false;
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
		var date = new Date(timestamp);			// generate date from earlies arrival time
		var offset = date.getTimezoneOffset()/60;			// get current timezone offset
			
		date.setHours(date.getHours()-offset);				// adjust date with offset
		
		return date.toJSON();				// set query date to earlies arrival date
	},


	/**
	 * Display error message and symbol
	 *
	 * @param jqXHR
	 */
	errorHandling: function(jqXHR) {
        var alert = document.getElementById("alert");
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
		var that = this;

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
		var that = this;

		that.trains.forEach(function(train, index, array) {
			if(train.journeyRef === journeyRef) {
				train.lock = false;
				return true;
			}
		});
		return false;
	},
 };