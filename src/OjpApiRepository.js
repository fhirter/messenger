export function OjpApiRepository({apiKey, station, limit}) {
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
                                            <PtModeFilter>
                                                <Mode>
                                                    <Exclude>true</Exclude>
                                                    <PtMode>rail</PtMode>
                                                    <siri:RailSubmode>regionalRail</siri:RailSubmode>
                                                </Mode>
                                            </PtModeFilter>
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

    async function get({type}) {
        const serializer = new XMLSerializer();
        const request = generateRequest({type, limit, station});
        const requestBody = serializer.serializeToString(request);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/xml',
            },
            body: requestBody,
        });

        return await response.text()
    }

    function generateRequest({type, limit, station}) {
        const parser = new DOMParser();

        // build arrivals request
        const request = parser.parseFromString(requestString, "text/xml");
        request.getElementsByTagName("StopPlaceRef")[0].innerHTML = station;
        // request.getElementsByTagName("StopEventType")[0].innerHTML = type;
        request.getElementsByTagName("NumberOfResults")[0].innerHTML = limit;

        request.getElementsByTagName("siri:RequestTimestamp")[0].innerHTML = getLocalIsoTime();
        return request;
    }

    function getLocalIsoTime() {
        const timezoneOffset = (new Date()).getTimezoneOffset() * 60000; // timezone offset in milliseconds
        return (new Date(Date.now() - timezoneOffset)).toISOString().substring(0, 19);
    }

    return {
        get,
    }
}