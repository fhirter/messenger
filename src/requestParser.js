export const requestParser = {
    prefix: "trias:",

    /**
     * Parse API Data from XML to train object array trains
     *
     *
     */
    parse: function (rawData) {
        let parser = new DOMParser();
        let data = parser.parseFromString(rawData,  "text/xml");

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

        train.lineName = service.getElementsByTagName(this.prefix + "PublishedLineName")[0].firstChild.textContent;
        let mode = service.getElementsByTagName(this.prefix + "Mode")[0];
        train.type = mode.getElementsByTagName(this.prefix + "RailSubmode")[0].textContent;

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
}