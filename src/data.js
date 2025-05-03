"use strict";

export const Data = function (config, requestParser) {
    const url = "https://api.opentransportdata.swiss/ojp20";
    let requestString = `<?xml version="1.0" encoding="UTF-8"?>
						<OJP xmlns="http://www.vdv.de/ojp" xmlns:siri="http://www.siri.org.uk/siri" version="2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vdv.de/ojp ../../../../OJP4/OJP.xsd">
							<OJPRequest>
								<siri:ServiceRequest>
									<siri:RequestTimestamp>2024-06-01T11:24:34.598Z</siri:RequestTimestamp>
									<siri:RequestorRef>MENTZRegTest</siri:RequestorRef>
									<OJPStopEventRequest>
										<siri:RequestTimestamp>2024-06-01T11:24:34.598Z</siri:RequestTimestamp>
										<siri:MessageIdentifier>SER</siri:MessageIdentifier>
										<Location>
											<PlaceRef>
												<StopPlaceRef>8507000</StopPlaceRef>
											</PlaceRef>
											<!-- <DepArrTime>2024-06-01T11:24:34.598Z</DepArrTime> -->
										</Location>
										<Params>
											<OperatorFilter>
												<Exclude>false</Exclude>
												<OperatorRef>11</OperatorRef>
											</OperatorFilter>
											<NumberOfResults>5</NumberOfResults>
											<StopEventType>both</StopEventType>
											<IncludePreviousCalls>true</IncludePreviousCalls>
											<IncludeOnwardCalls>true</IncludeOnwardCalls>
											<UseRealtimeData>full</UseRealtimeData>
										</Params>
									</OJPStopEventRequest>
								</siri:ServiceRequest>
							</OJPRequest>
						</OJP>`;

    let trains;

    async function fetchApi(type) {
        const serializer = new XMLSerializer();
        const request = generateRequest(type);
        const requestBody = serializer.serializeToString(request);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                'Authorization': config.API_KEY,
                'Content-Type': 'application/xml',
            },
            body: requestBody,
        });

        const data = await response.text()
        return requestParser.parse(data);
    }

    function generateRequest(type) {
        const parser = new DOMParser();

        // build arrivals request
        const request = parser.parseFromString(requestString, "text/xml");
        request.getElementsByTagName("StopPlaceRef")[0].innerHTML = config.station;
       // request.getElementsByTagName("StopEventType")[0].innerHTML = type;
        request.getElementsByTagName("NumberOfResults")[0].innerHTML = config.limit;

        request.getElementsByTagName("siri:RequestTimestamp")[0].innerHTML = getLocalIsoTime();
        return request;
    }

    // set time of request to now()
    function getLocalIsoTime() {
        const timezoneOffset = (new Date()).getTimezoneOffset() * 60000; // timezone offset in milliseconds
        return (new Date(Date.now() - timezoneOffset)).toISOString().substr(0, 19);
    }


    /**
     *
     * Merge arrivalTrains and departureTrains arrays to trains property array
     *
     * @param arrivalTrains -  array of arriving trains
     * @param departureTrains - array of departing trains
     */
    function merge(arrivalTrains, departureTrains) {
        let mergedTrains = [];
        let mergedTrain;

        arrivalTrains.forEach(function (arrivingTrain) {
            mergedTrain = arrivingTrain;
            mergedTrain.arrivingCancelled = mergedTrain.cancelled;
            delete mergedTrain.cancelled;

            // search departing trains for journeyReference of arriving train
            const departingTrain = departureTrains.find(function (departingTrain) {
                return departingTrain.journeyRef === arrivingTrain.journeyRef;
            });

            if (departingTrain !== undefined) {                        // when corresponding train found
                mergedTrain.departureTime = departingTrain.departureTime;
                mergedTrain.estimatedDepartureTime = departingTrain.estimatedDepartureTime;
                mergedTrain.departureCancelled = departingTrain.cancelled;

                departureTrains = departureTrains.filter((element) => {
                    return element !== departingTrain;
                })
            }
            mergedTrains = insertOrUpdate(mergedTrain, mergedTrains);
        });

        departureTrains.forEach(function (departureTrain) {                 // push remaining departing trains
            departureTrain.departureCancelled = departureTrain.cancelled;
            delete departureTrain.cancelled;

            mergedTrains = insertOrUpdate(departureTrain, mergedTrains)
        });

        console.log("arrival: " + arrivalTrains.length, "departure: " + departureTrains.length, "merged: " + mergedTrains.length)

        return mergedTrains;
    }

    function insertOrUpdate(mergedTrain, mergedTrains) {
        const foundTrain = mergedTrains.find(function (needle) {
            return mergedTrain.journeyRef === needle.journeyRef;
        });

        if (foundTrain === undefined) { 	// when train not yet in list
            mergedTrains.push(mergedTrain);
        } else {
            updateTrain(foundTrain, mergedTrain)
        }
        return mergedTrains;
    }

    /**
     * Search for train object in this.trains with same journeyRef as parameter object train. If found update all available information
     *
     *
     * @returns {boolean} - false if train not in array this.trains, else true
     * @param receiverTrain
     * @param updaterTrain
     */
    function updateTrain(receiverTrain, updaterTrain) {
        let keys = ["arrivalTime", "departureTime", "arrivalDelay", "departureDelay", "cancelled", "changedPlatform", "platform"];

        keys.forEach((key) => {
            if (updaterTrain[key] !== undefined) {
                receiverTrain[key] = updaterTrain[key];
            }
        })
    }

    /**
     * check if departure time of train is in the past
     *
     * @param train
     * @returns {boolean} - returns false if train can be removed from lilst
     */
    function isDepartureInThePast(train) {
        if (train !== undefined) {
            if (train.lock === true) {				// keep in list, when lock is set
                return true;
            }

            if (typeof train.estimatedDepartureTime === 'object') {
                if (train.estimatedDepartureTime < Date.now()) {
                    return false;														// estimated departure time is set and in the past
                }
            } else {
                if (typeof train.departureTime === 'object' && train.departureTime < Date.now()) {
                    return false;																			// regular departure time is set and in the past
                }
            }

            if (typeof train.departureTime === 'undefined') {						// no departure time set == train stays at station
                if (typeof train.estimatedArrivalTime === 'object') {
                    if (train.estimatedArrivalTime < Date.now()) {
                        return false;												// estimated arrival is set an in the past
                    }
                } else {
                    if (typeof train.arrivalTime === 'object' && train.arrivalTime < Date.now()) {
                        return false;																		// regular arrival is set and in the past
                    }
                }
            }
        }
        return true;
    }

    /**
     *
     * Filter helper function:
     * Return true if
     *        - train.type is in array this.config.transportations
     *        - train.lock is true
     *
     * function is used to filter by transportation types
     *
     * @param train - train object
     * @returns {boolean}
     */
    function checkType(train) {
        const found = config.transportations.includes(train.type);

        return (found || train.lock === true)
    }

    /**
     * Generate JSON Date from timestamp
     *
     * @param timestamp
     * @returns {string} - JSON Datestring
     */
    function timestampToJson(timestamp) {
        const date = new Date(timestamp);			// generate date from earlies arrival time
        const offset = date.getTimezoneOffset() / 60;			// get current timezone offset

        date.setHours(date.getHours() - offset);				// adjust date with offset

        return date.toJSON();				// set query date to earliest arrival date
    }


    /**
     * Display error message and symbol
     *
     * @param jqXHR
     */
    function errorHandling(jqXHR) {
        const alert = document.getElementById("alert");
        alert.style.visibility = "visible";

        alert.getElementsByTagName("span")[0].text(jqXHR.statusText);

        console.log("errorHandling: ", jqXHR.statusText);
    }


    /**
     *
     * Set property lock to true in train object in this.trains with corresponding journeyRef property
     *
     * @param journeyRef
     * @returns {boolean} - true if matching object found, else false
     */
    function lock(journeyRef) {
        trains.forEach(function (train, index, array) {
            if (train.journeyRef === journeyRef) {
                train.lock = true;
                return true;
            }
        });
        return false;
    }

    /**
     * Change property lock to false in train object in this.trains with corresponding journeyRef property
     *
     * @param journeyRef
     * @returns {boolean} - true if matching object found, else false
     */
    function unlock(journeyRef) {
        trains.forEach(function (train, index, array) {
            if (train.journeyRef === journeyRef) {
                train.lock = false;
                return true;
            }
        });
        return false;
    }

    /**
     * Set user configuration
     *
     * @param _config
     */
    function setConfig(_config) {
        config = _config;
    }

    /**
     * Generate request and load data from api
     * Arrival and departure data gets loaded simultaneously, when both has been loaded parse() gets called
     *
     */
    async function load() {
        if (config.API_KEY.length === 0) {
            console.log("No API Key specified!");
            return false;
        }

        console.log('loading')
        const arrivalsPromise = fetchApi("arrival");
        const departurePromise = fetchApi("departure");

        const results = await Promise.allSettled([arrivalsPromise, departurePromise]);  // synchronize

        console.log(results)
        let trains = merge(results[0].value, results[1].value);

        trains = trains.filter(isDepartureInThePast);       // filter out trains which left the station
        trains = trains.filter(checkType.bind(this));     // filter by train types

        return trains;
    }

    return {
        setConfig,
        load
    }
}