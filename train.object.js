var train = {
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