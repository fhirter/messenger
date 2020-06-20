"use strict";
/**
 * Presentation layer object
 *
 * Displays train data from data object in html list
 *
 */
let stationBoard = {
	refreshRate: 30, // [s]
	intervalId: 0,
	countdown: 0,
	
	data: {},		// data object
	
	earliestArrival: 0, // seconds timestamp

	transportationsEquivalents: [
		['RegioExpress','RE'],
		['Intercity','IC'],
		['Eurocity','EC'],
		['InterRegio','IR'],
		['ICE','ICE'],
		['S-Bahn','S']
	],

	config: {
		station: "8507000",
		transportations: ['RegioExpress', 'Intercity', 'Eurocity','InterRegio', 'ICE'],
		limit: 40,
	},
	
	setRefreshRate: function(refreshRate) {
		this.refreshRate = refreshRate;
		this.startAutoRefresh();
		this.resetCountdown();
	},

	startAutoRefresh: function() {
        let that = this;
		if(that.intervalId !== 0) {
			clearInterval(that.intervalId);
		}
		this.intervalId = setInterval(function() {that.load()},(that.refreshRate)*1000);
	},
	
	setLimit: function(limit) {
		this.config.limit = limit;
		this.saveConfig();
		this.load();		// reset output
		this.startAutoRefresh();

	},
	
	setTransportations: function(transportations) {
		this.config.transportations = transportations;
		this.saveConfig();
		this.load();		// reset output
		this.startAutoRefresh();	
	},

	saveConfig: function () {
		if (typeof(Storage) !== "undefined") {
			localStorage.config = JSON.stringify(this.config);
		}
	},
	
	startCountdown: function() {
		var that = this;
		this.countdown = this.refreshRate;
		document.getElementById("countdown").textContent = that.countdown;
		setInterval(function() {that.decrementCountdown()},1000);
	},
	
	decrementCountdown: function() {
		this.countdown--;
		document.getElementById("countdown").textContent = this.countdown;
		if(this.countdown === 0) {
			this.load();
		}
	},
	
	resetCountdown: function() {
		this.countdown = this.refreshRate;
	},
	
	
	load: function() {
		this.resetCountdown();

		var countdown = document.getElementById("countdown");
		countdown.classList.add("loading");
		countdown.classList.remove("counting");


		if (typeof(Storage) !== "undefined") {
			if (localStorage.config) {
				this.config = JSON.parse(localStorage.config);
			}
		}

		this.data.setConfig(this.config);			// set configuration for data object
		this.data.load(this.parse,this);
	},

	parseJourneyRef: function (train) {
		let that = this;
		let string;
		let lineNo;
		let journeyNo;
		let journeyRef;
		let type = train.type;


		// replace transportation type with shorthand name, i.e. Intercity becomes IC
		that.transportationsEquivalents.forEach(function(pair) {
			type = type.replace(pair[0],pair[1]);
		});


		journeyRef = train.journeyRef.split(':');

		lineNo = parseInt(journeyRef[1].substr(2,3),10);
		journeyNo = journeyRef[5];

		string = type + " " + lineNo + " " + journeyNo;

		return string;
	},

	parse: function() {
		let that = this;

		let i;
		let train;

		let table = document.querySelector("#arrivals tbody");

		let arrivalDelay, departureDelay;

		while(table.firstChild) {						//emtpy table
            table.removeChild(table.firstChild);
        }

		for(i=0;i<that.data.trains.length;i++) {
			let row = document.createElement("tr");

			let platform = document.createElement("td");
			let type = document.createElement("td");
			let from = document.createElement("td");
			let fromPasslist = document.createElement("td");
			let to = document.createElement("td");
			let toPasslist = document.createElement("td");
			let arrivalTime = document.createElement("td");
			let departureTime = document.createElement("td");


			train = this.data.trains[i];

			// lock
			let lock = document.createElement("td");
			lock.classList.add("lock");

			let checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.id = train.journeyRef;
			checkbox.addEventListener("change", function(event) {
				if(this.checked) {
					that.data.lock(this.id);
				} else {
					that.data.unlock(this.id);
				}
			});
			if(train.lock === true) {
				checkbox.checked = true;
			}
			lock.appendChild(checkbox);

            if(train.arrivingCancelled === true) {
                from.classList.add("cancelled");
                fromPasslist.classList.add("cancelled");
                arrivalTime.classList.add("cancelled");
            }

			if(train.departureCancelled === true) {
				to.classList.add("cancelled");
				toPasslist.classList.add("cancelled");
				departureTime.classList.add("cancelled");
			}

			// arrival
			platform.classList.add("platform");

            if (train.platform !== undefined) {
				platform.appendChild(document.createTextNode(train.platform));
				if (train.changedPlatform === true) {
					platform.classList.add("delay");
				}
			}

			type.classList.add("type");
            type.appendChild(document.createTextNode(this.parseJourneyRef(train)));

			from.classList.add("from");
			from.appendChild(document.createTextNode(train.from));

			fromPasslist.classList.add("passlist");
			fromPasslist.appendChild(document.createTextNode(this.parsePasslist(train.fromPasslist)));

			arrivalTime.classList.add("arrival_time");
			arrivalTime.appendChild(document.createTextNode(that.formatTime(train.arrivalTime,"HH:mm")));

			arrivalDelay = that.getDelay(train.estimatedArrivalTime,train.arrivalTime);
			var arrivalDelayElement = document.createElement("span");
			if(arrivalDelay !== false) {
				if(arrivalDelay>0) {
                    arrivalDelayElement.classList.add("delay");
					arrivalDelayElement.appendChild(document.createTextNode("+"+arrivalDelay/(1000*60)+"\'"));
				} else {
					arrivalDelayElement.classList.add("early");
					arrivalDelayElement.appendChild(document.createTextNode(arrivalDelay/(1000*60)+"\'"));
                }


			}
			arrivalTime.appendChild(arrivalDelayElement);

			// departure
			to.classList.add("to");
			to.classList.add("departure");
			to.appendChild(document.createTextNode(train.to));

			toPasslist.classList.add("passlist");
			toPasslist.classList.add("departure");
			toPasslist.appendChild(document.createTextNode(this.parsePasslist(train.toPasslist)));

			departureTime.classList.add("departure_time");
			departureTime.classList.add("departure");
			departureTime.appendChild(document.createTextNode(that.formatTime(train.departureTime,"HH:mm")));

			departureDelay = that.getDelay(train.estimatedDepartureTime, train.departureTime);
			var departureDelayElement = document.createElement("span");
			if(departureDelay !== false) {
				if(departureDelay>0) {
					departureDelayElement.classList.add("delay");
				}
				departureDelayElement.appendChild(document.createTextNode("+"+departureDelay/(1000*60)+"\'"))
			}
			departureTime.appendChild(departureDelayElement);


			row.appendChild(platform);
			row.appendChild(type);
			row.appendChild(from);
			row.appendChild(fromPasslist);
			row.appendChild(arrivalTime);
			row.appendChild(departureTime);
			row.appendChild(toPasslist);
			row.appendChild(to);
			row.appendChild(lock);
			table.appendChild(row);

			var countdown = document.getElementById("countdown");
			countdown.classList.remove("loading");
			countdown.classList.add("counting");

		}
		
			
	},

	formatTime: function (date, formatString) {
		let hours, minutes, time;
		if(formatString === "HH:mm" && date !== undefined) {
			hours = date.getHours();
			minutes = date.getMinutes();
			if(minutes < 10) {
				minutes = "0"+minutes;
			}
			return hours+":"+minutes;
		} else {
			return "";
		}
    },

	getDelay: function(estimatedTime, scheduledTime) {
		let delay;
		if (estimatedTime !== undefined && scheduledTime !== undefined) {
			delay = estimatedTime - scheduledTime;
			if(delay === 0) {				// ignore delays <60s
				return false;
			}
			return delay;
		} else {
			return false;
		}
	},
	
	parsePasslist: function(passlist) {
		let k;
		let stringPasslist = "";
		if(passlist === undefined) {
			return "";
		} else {
			for(k=0;k<passlist.length;k++) {
				stringPasslist += passlist[k];
				if(passlist.length>(k+1)) {
					stringPasslist += " - ";
				}
			}
			return stringPasslist;
		}
	}
};