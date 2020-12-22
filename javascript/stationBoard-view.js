"use strict";
/**
 * Presentation layer object
 *
 * Displays train data from data object in html list
 *
 */

let stationBoardView = {
	refreshRate: 30, // [s]
	earliestArrival: 0, // seconds timestamp

	config: {
		station: "8507000",
		transportations: ['international', 'regionalRail', 'interregionalRail'], // one of: ['international', 'regionalRail', 'interregionalRail']
		limit: 40,
	},

	parse: function(trains) {
		let that = this;

		const table = document.querySelector("#arrivals tbody");

		while(table.firstChild) {						//empty table
			table.removeChild(table.firstChild);
		}

		trains.forEach( (train) => {
			let row = document.createElement("tr");

			let rowElements = {
				'platform': that.createPlatformField(train),
				'type': this.createTypeField(train),
				'from': this.createFromField(train),
				'fromPasslist': this.createFromPasslistElement(train),
				'arrivalTime': this.createArrivalTimeElement(train),
				'departureTime': this.createDepartureTimeElement(train),
				'toPasslist': this.createToPasslistElement(train),
				'to': this.createToElement(train),
				'lock': that.createLockField(train),
			};

			Object.values(rowElements).forEach((element) => {
				if(element !== undefined) {
					row.appendChild(element);
				}
			})

			table.appendChild(row);
		})
	},

	createLockField: function (train, that) {
		let lock = document.createElement("td");
		lock.classList.add("lock");

		let checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.id = train.journeyRef;
		checkbox.addEventListener("change", function (event) {
			if (this.checked) {
				that.data.lock(this.id);
			} else {
				that.data.unlock(this.id);
			}
		});
		if (train.lock === true) {
			checkbox.checked = true;
		}
		lock.appendChild(checkbox);

		return lock;
	},

	createPlatformField: function (train) {
		let platform = document.createElement("td");
		platform.classList.add("platform");

		if (train.platform !== undefined) {
			platform.appendChild(document.createTextNode(train.platform));
			if (train.changedPlatform === true) {
				platform.classList.add("delay");
			}
		}
		return platform;
	},
	createTypeField: function (train) {
		let type = document.createElement("td");
		type.classList.add("type");

		type.appendChild(document.createTextNode(train.lineName));

		return type;
	},
	createFromField: function (train) {
		let from = document.createElement("td");
		from.classList.add("from");
		from.appendChild(document.createTextNode(train.from));

		if(train.arrivingCancelled === true) {
			from.classList.add("cancelled");
		}

		return from;
	},
	createArrivalTimeElement: function (train) {
		const that = this;

		let arrivalTime = document.createElement("td");
		arrivalTime.classList.add("arrival_time");
		arrivalTime.appendChild(document.createTextNode(that.formatTime(train.arrivalTime, "HH:mm")));

		let arrivalDelay = that.getDelay(train.estimatedArrivalTime, train.arrivalTime);
		let arrivalDelayElement = document.createElement("span");
		if (arrivalDelay !== false) {
			if (arrivalDelay > 0) {
				arrivalDelayElement.classList.add("delay");
				arrivalDelayElement.appendChild(document.createTextNode("+" + arrivalDelay / (1000 * 60) + "\'"));
			} else {
				arrivalDelayElement.classList.add("early");
				arrivalDelayElement.appendChild(document.createTextNode(arrivalDelay / (1000 * 60) + "\'"));
			}


		}

		if(train.arrivingCancelled === true) {
			arrivalTime.classList.add("cancelled");
		}

		arrivalTime.appendChild(arrivalDelayElement);
		return arrivalTime;
	},

	createFromPasslistElement: function (train) {
		let fromPasslist = document.createElement("td");
		fromPasslist.classList.add("passlist");
		fromPasslist.appendChild(document.createTextNode(this.parsePasslist(train.fromPasslist)));
		if (train.arrivingCancelled === true) {
			fromPasslist.classList.add("cancelled");
		}
		return fromPasslist;
	},

	createToElement: function (train) {
		let to = document.createElement("td");
		to.classList.add("to");
		to.classList.add("departure");
		to.appendChild(document.createTextNode(train.to));

		if(train.departureCancelled === true) {
			to.classList.add("cancelled");
		}

		return to;
	},

	createToPasslistElement: function (train) {
		let toPasslist = document.createElement("td");
		toPasslist.classList.add("passlist");
		toPasslist.classList.add("departure");
		toPasslist.appendChild(document.createTextNode(this.parsePasslist(train.toPasslist)));

		if(train.departureCancelled === true) {
			toPasslist.classList.add("cancelled");
		}

		return toPasslist;
	},

	createDepartureTimeElement: function (train) {
		let that = this;

		let departureTime = document.createElement("td");
		departureTime.classList.add("departure_time");
		departureTime.classList.add("departure");
		departureTime.appendChild(document.createTextNode(that.formatTime(train.departureTime, "HH:mm")));

		let departureDelay = that.getDelay(train.estimatedDepartureTime, train.departureTime);
		let departureDelayElement = document.createElement("span");
		if(departureDelay !== false) {
			if(departureDelay>0) {
				departureDelayElement.classList.add("delay");
			}
			departureDelayElement.appendChild(document.createTextNode("+"+departureDelay/(1000*60)+"\'"))
		}
		departureTime.appendChild(departureDelayElement);

		if(train.departureCancelled === true) {
			departureTime.classList.add("cancelled");
		}

		return departureTime;
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