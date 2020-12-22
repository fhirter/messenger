'use strict';

data.apiKey = apiKey;
data.setConfig(stationBoard.config);			// set configuration for data object

// stationBoard.startLoading(data);

data.load(requestParser).then((trains) => {
	stationBoard.parse(trains);
});

translation.load();
document.querySelector("option[value="+translation.code+"]").selected = true;		// set selected language
translation.parse();

