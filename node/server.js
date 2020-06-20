var http = require('http');
var url = require('url');
var fs = require('fs');

var stations = require('./stations');


http.createServer(function (request, response) {
    var requestUrl = url.parse(request.url, true);

    var station;
	var datatype;
	var landingpage = "/index.html";

	var documentRoot = "..";


	if(requestUrl.pathname === "/") {
		filename = landingpage;
	} else {
		filename = requestUrl.pathname;
	}



	var pathsplit = filename.split(".");
	datatype = pathsplit[pathsplit.length-1];

	if (requestUrl.pathname === "/stations") {
		station = requestUrl.query.q;

		stations.getStations(station, function (stationList) {

			if(stationList.length > 0) {
				response.writeHead(200, {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*'
				});

				response.write(JSON.stringify(stationList));
			} else {
				response.writeHead(404, {'Content-Type': 'text/plain'});
				response.write("Station not found!");
			}

			return response.end();
		});

	} else {
		filename = documentRoot+filename;

		fs.readFile(filename, function (error, data) {
			if (error) {
				console.log(error);
				response.writeHead(404, {'Content-Type': 'text/html'});

				return response.end("404 Not Found");
			}
			switch (datatype) {
				case "html":
					response.writeHead(200, {'Content-Type': 'text/html'});
					break;
				case "css":
					response.writeHead(200, {'Content-Type': 'text/css'});
					break;
				case "js":
					response.writeHead(200, {'Content-Type': 'text/javascript'});
					break;
				case "png":
					response.writeHead(200, {'Content-Type': 'image/png'});
					break;
				default:
					response.writeHead(404, {'Content-Type': 'text/html'});
					return response.end("404 Not Found");
					break;
			}

			response.write(data);
			response.end();
		});
	}


}).listen(80);