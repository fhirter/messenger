'use strict';

data.apiKey = apiKey;
data.mikuLink = mikuLink;

const reloadInterval = 30;

load();

setInterval(() => {
	load();
}, reloadInterval*10000)

function load() {
	data.setConfig(stationBoardView.config);			// set configuration for data object
	data.load(requestParser).then((trains) => {
		stationBoardView.parse(trains);
	});
}

