var fs = require('fs');
var parse = require('csv-parse');
var sqlite = require('sqlite3').verbose();

module.exports = {
	db: new sqlite.Database('stations.db'),

	importCsv: function(filename) {
		var that = this;

		fs.readFile(filename, function (error, data) {
			if (error) {
			}

			parse(data, function (error, output) {
				var query = "INSERT INTO stations (code, name) VALUES ($code, $name)";

				for (var i = 0; i < output.length; i++) {
					if(error) {
						console.log(error);
					}
					var station = output[i];
					station.name = station[1].slice(0, station[1].indexOf("$<1>"));   // $: delimiter, <1>: name, <2> Longname, <3> short, <4> synonym
					station.code = station[0];

					that.db.run(query, {
						$code: station.code,
						$name: station.name
					});

					// console.log(station.code, station.name);

					// if(station.name.indexOf("Ber") === 0 && station.name.indexOf(",") === -1) {            // exclude all non-mainstations
					//     console.log(station);
					// }
				}
				console.log(i);
			});
		});
	},

	getStations: function(nameQuery, callback) {
		var that = this;
		var stations = [];

		nameQuery = nameQuery + "%";

		var query = "SELECT * FROM stations WHERE name LIKE ? AND name NOT LIKE '%,%' ORDER BY name";

		// that.db.serialize(function () {
			that.db.all(query, nameQuery, function (error, rows) {
				if (error) {
					console.log(error);
				}
				rows.forEach(function (row) {
					stations.push({
						name: row.name,
						code: row.code
					})
				});
				callback(stations);
			});


		// });

	}
}