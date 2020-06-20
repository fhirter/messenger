//get stations list

// todo: change to fetch
stations = {
	getStations: function(station) {
		let url = "/stations?q="+station;
		let xhr = new XMLHttpRequest();

		if (xhr) {
			xhr.open('GET', url, true);		// method, url, async

			xhr.addEventListener("load", function() {
				let data = JSON.parse(xhr.response);
				console.log(data);
			});

			xhr.send(null);

		}
	}
}