import {describe, it, expect, vi} from "vitest"
import {requestParser} from "./requestParser.js";
import fs from "fs";
import path from "path";

describe('parse', () => {
    it('should parse raw XML data into trains array', () => {
        const response = fs.readFileSync(path.resolve(__dirname, "response.xml"), "utf-8");


        const trains = requestParser.parse(response);

        const train = trains[0];

        expect(trains).toBeInstanceOf(Array);
        expect(trains).toHaveLength(40);

        expect(train).toMatchObject({
            platform: expect.any(String),
        });

        /**
        const train = {
            platform: "",					// Gleis-Nr
            changedPlatform: false,			// true wenn Gleisänderung, boolean
            arrivalTime: {},				// Fahrplanmässige Ankunftszeit, Date
            departureTime: {},				// Fahrplanmässige Abfahrtszeit, Date
            estimatedArrivalTime: "",		// Erwartete Ankunftszeit
            estimatedDepartureTime: "",		// Ertwartete Abfahrtszeit
            lineRef: "",					// Linien-ID (https://opentransportdata.swiss/de/cookbook/service-vdv-431/)
            journeyRef: "",
            type: "",						// Linientyp (Intercity, RegioExpress, InterRegio, S-Bahn, EC, ICE)
            from: "",						// Herkunftsort
            to: "",							// Destination
            fromPasslist: [],				// String Array
            toPasslist: [],					// String Array
            cancelled: false,				// boolean
            unplanned: false,				// boolean
            lock: false,					// boolean
        };
*/

    });
});
