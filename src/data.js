"use strict";

import {OjpApiRepository} from "./OjpApiRepository.js";

export function Data(config, requestParser) {
    let trains;

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

        const apiRepository = new OjpApiRepository({
            apiKey: config.API_KEY,
            limit: config.limit,
            station: config.station,
        });

        const arrivalsPromise =  apiRepository.get({
            type: "arrival",
        });
        const departuresPromise = apiRepository.get("departure");

        const results = await Promise.allSettled([arrivalsPromise, departuresPromise]);  // synchronize

        console.log(results)

        const arrivals = requestParser.parse(results[0].value);
        const departures = requestParser.parse(results[1].value);

        let trains = merge(arrivals, departures);

        trains = trains.filter(isDepartureInThePast);       // filter out trains which left the station
        trains = trains.filter(checkType.bind(this));     // filter by train types

        return trains;
    }

    return {
        setConfig,
        load
    }
}