
function getText(node) {
    return node.getElementsByTagName("Text")[0].textContent;
}

export const requestParser = {
    prefix: "siri",

    /**
     * Parse API Data from XML to train object array trains
     *
     */
    parse: function (rawData) {
        const parser = new DOMParser();
        const data = parser.parseFromString(rawData, "text/xml");

        const trains = [];

        const stopEventResults = data.getElementsByTagName("StopEventResult");
        for (let i = 0; i < stopEventResults.length; i++) {
            const train = {};
            this.parseService(stopEventResults[i].getElementsByTagName("Service")[0], train);
            this.parseThisCall(stopEventResults[i].getElementsByTagName("ThisCall")[0], train);		// current stop
            train.fromPasslist = this.parsePasslist(stopEventResults[i].getElementsByTagName("PreviousCall"));	// from passlist (PreviousCall)
            train.toPasslist = this.parsePasslist(stopEventResults[i].getElementsByTagName("OnwardCall"));		// to passlist (OnwardCall)

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
        train.lineRef = service.getElementsByTagName(`${this.prefix}:LineRef`)[0].textContent;
        train.journeyRef = service.getElementsByTagName(`JourneyRef`)[0].textContent;

        train.lineName = getText(service.getElementsByTagName(`PublishedServiceName`)[0]);

        const mode = service.getElementsByTagName(`Mode`)[0];
        train.type = mode.getElementsByTagName(`${this.prefix}:RailSubmode`)[0].textContent;

        train.from = getText(service.getElementsByTagName(`OriginText`)[0]);
        train.to = getText(service.getElementsByTagName(`DestinationText`)[0]);

        const cancelled = service.getElementsByTagName(`Cancelled`)[0];
        train.cancelled = false;
        if (cancelled !== undefined && cancelled?.textContent === "true") {
            train.cancelled = true;
            console.log("parseService: ", train.from, train.to, "cancelled");
        }

        const unplanned = service.getElementsByTagName(`Unplanned`)[0];
        train.unplanned = false;
        if (unplanned !== undefined && unplanned?.textContent === "true") {
            train.unplanned = true;
            console.log("parseService:", train.from, train.to, "unplanned");
        }
    },

    /**
     * Parse thisCall XML structure to train object
     *
     * @param thisCall - xml structure to be parsed
     * @param train - train object to be populated
     */
    parseThisCall: function (thisCall, train) {
        const plannedQuay = thisCall.getElementsByTagName("PlannedQuay")[0];
        if (plannedQuay !== undefined) {
            train.platform = getText(plannedQuay);
        } else {
            delete train.platform;
        }


        const estimatedBay = thisCall.getElementsByTagName("EstimatedQuay")[0];
        if (estimatedBay !== undefined) {
            train.platform = getText(estimatedBay);
            train.changedPlatform = true;
        }

        const serviceArrival = thisCall.getElementsByTagName("ServiceArrival")[0];
        const serviceDeparture = thisCall.getElementsByTagName("ServiceDeparture")[0];

        if (serviceArrival !== undefined) {
            train.arrivalTime = new Date(serviceArrival.getElementsByTagName("TimetabledTime")[0].textContent);
            const estimatedTime = serviceArrival.getElementsByTagName("EstimatedTime")[0];
            if (estimatedTime !== undefined) {
                train.estimatedArrivalTime = new Date(estimatedTime.textContent);
            }
        }

        if (serviceDeparture !== undefined) {
            train.departureTime = new Date(serviceDeparture.getElementsByTagName("TimetabledTime")[0].textContent);
            const estimatedTime = serviceDeparture.getElementsByTagName("EstimatedTime")[0];
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
        const passlistFormat = [];

        for (let i = 0; i < passlist.length; i++) {
            passlistFormat.push(getText(passlist[i].getElementsByTagName("StopPointName")[0]));
        }
        return passlistFormat;
    },
}