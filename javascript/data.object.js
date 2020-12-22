"use strict";

let data = {
	config: {},

    url: "https://api.opentransportdata.swiss/trias2020",
	requestString: '<?xml version="1.0" encoding="UTF-8"?> <Trias version="1.1" xmlns="http://www.vdv.de/trias" xmlns:siri="http://www.siri.org.uk/siri" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"> <ServiceRequest> <siri:RequestTimestamp>2016-06-27T13:34:00</siri:RequestTimestamp> <siri:RequestorRef>EPSa</siri:RequestorRef> <RequestPayload> <StopEventRequest> <Location> <LocationRef> <StopPointRef></StopPointRef> </LocationRef> <DepArrTime> </DepArrTime> </Location> <Params> <NumberOfResults></NumberOfResults> <StopEventType></StopEventType> <IncludePreviousCalls>true</IncludePreviousCalls> <IncludeOnwardCalls>true</IncludeOnwardCalls> <IncludeRealtimeData>true</IncludeRealtimeData> </Params> </StopEventRequest> </RequestPayload> </ServiceRequest> </Trias>',

	apiKey: "",

	requestParser: {},

	/**
	 * Set user configuration
	 *
	 * @param config - Properties: string station, array transportations, int limit
	 */
    setConfig: function (config) {
	    this.config = config;
    },

	/**
	 * Genereate request and load data from api
	 * Arrival and departure data gets loaded simultaniously, when both has been loaded parse() gets called
	 *
	 */
	load: async function (requestParser) {
		const that = this;

		that.requestParser = requestParser;

		if(this.apiKey.length === 0) {
			console.log("No API Key specified!")
			return false;
		}

		let arrivalsPromise = this.fetchApi("arrival");
		let departurePromise = this.fetchApi("departure");

		let results = await Promise.allSettled([arrivalsPromise, departurePromise]);  // synchronize

		let trains = this.merge(results[0].value, results[1].value);

		trains = trains.filter(this.isDepartureInThePast);       // filter out trains which left the station
		trains = trains.filter(this.checkType.bind(this));     // filter by train types

		return trains;
    },

	fetchApi: async function (type) {
		let that = this;

		const serializer = new XMLSerializer();
		let request = this.generateRequest(type);
		const requestBody = serializer.serializeToString(request);

		let response = await fetch(that.url, {
			method: "POST",
			headers: {
				'Authorization': that.apiKey,
				'Content-Type': 'application/xml',
			},
			body: requestBody,
		});

		let data = await response.text()
		return that.requestParser.parse(data);
	},

	generateRequest: function (type) {
		const that = this;

		let parser = new DOMParser();

		// build arrivals request
		let request = parser.parseFromString(that.requestString, "text/xml");
		request.getElementsByTagName("StopPointRef")[0].innerHTML = that.config.station;
		request.getElementsByTagName("StopEventType")[0].innerHTML = type;
		request.getElementsByTagName("NumberOfResults")[0].innerHTML = that.config.limit;

		request.getElementsByTagName("DepArrTime")[0].innerHTML = this.getLocalIsoTime();
		return request;
	},

	// set time of request to now()
	getLocalIsoTime: function () {
		let timezoneOffset = (new Date()).getTimezoneOffset() * 60000; // timezone offset in milliseconds
		return (new Date(Date.now() - timezoneOffset)).toISOString().substr(0, 19);
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

        arrivalTrains.forEach(function(arrivingTrain) {
			mergedTrain = arrivingTrain;
			mergedTrain.arrivingCancelled = mergedTrain.cancelled;
			delete mergedTrain.cancelled;

			// search departing trains for journeyReference of arriving train
            let departingTrain = departureTrains.find(function(departingTrain) {
                return departingTrain.journeyRef === arrivingTrain.journeyRef;
            });

            if(departingTrain !== undefined) {                        // when corresponding train found
                mergedTrain.departureTime = departingTrain.departureTime;
				mergedTrain.estimatedDepartureTime = departingTrain.estimatedDepartureTime;
				mergedTrain.departureCancelled = departingTrain.cancelled;

				departureTrains = departureTrains.filter((element) => {
					return element !== departingTrain;
				})
            }
			mergedTrains = that.insertOrUpdate(mergedTrain, mergedTrains);
		});

        departureTrains.forEach(function (departureTrain) {                 // push remaining departing trains
			departureTrain.departureCancelled = departureTrain.cancelled;
			delete departureTrain.cancelled;

			mergedTrains = that.insertOrUpdate(departureTrain, mergedTrains)
        });

        console.log("arrival: "+arrivalTrains.length, "departure: "+departureTrains.length, "merged: "+mergedTrains.length)

		return mergedTrains;
    },

	insertOrUpdate: function(mergedTrain, mergedTrains) {
		const that = this;
		let foundTrain = mergedTrains.find(function (needle) {
			return mergedTrain.journeyRef === needle.journeyRef;
		});

		if (foundTrain === undefined) { 	// when train not yet in list
			mergedTrains.push(mergedTrain);
		} else {
			that.updateTrain(foundTrain, mergedTrain)
		}
		return mergedTrains;
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

		let found = that.config.transportations.includes(train.type);

		return (found || train.lock === true)
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