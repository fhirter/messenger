import {describe, it, expect, vi} from "vitest"
import {requestParser} from "./requestParser.js";
import fs from "fs";
import path from "path";

describe('parse', () => {
    const response = fs.readFileSync(path.resolve(__dirname, "response.xml"), "utf-8");
    let trains;
    beforeEach(() => {
        trains = requestParser.parse(response);
    });
    it('should return an array', () => {
        expect(trains).toBeInstanceOf(Array);
    });
    it('should return a non empty array', () => {
        expect(trains.length).toBeGreaterThan(0);
    });
    it('should return an array of train objects', () => {
        const train = trains[0];

        expect(train).toMatchObject({
            platform: expect.any(String),
            changedPlatform: false,
            arrivalTime: expect.any(Object),
            departureTime: expect.any(Object),
            estimatedArrivalTime: expect.any(String),
            estimatedDepartureTime: expect.any(String),
            lineRef: expect.any(String),
            journeyRef: expect.any(String),
            type: expect.any(String),
            from: expect.any(String),
            to: expect.any(String),
            fromPasslist: expect.any(Array),
            toPasslist: expect.any(Array),
            cancelled: expect.any(Boolean),
            unplanned: expect.any(Boolean),
            lock: expect.any(Boolean),
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
