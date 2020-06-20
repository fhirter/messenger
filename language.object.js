language = {
	code: 'de-CH',
	sets: {
		'de-CH': [
			['type', 'Typ'],
			['from', 'Von'],
			['fromPasslist', 'Stationen'],
			['arrivalTime', 'An'],
			['departureTime', 'Ab'],
			['toPasslist', 'Stationen'],
			['to', 'Nach'],
			['lock', 'lock'],
			['de-CH', 'Deutsch'],
			['fr-CH', 'Französisch'],
			['it-CH', 'Italienisch'],
		],

		'fr-CH': [
			['type', 'TypF'],
			['from', 'VonF'],
			['fromPasslist', 'StationenF'],
			['arrivalTime', 'AnF'],
			['departureTime', 'AbF'],
			['toPasslist', 'StationenF'],
			['to', 'NachF'],
			['lock', 'lockF'],
			['de-CH', 'allemand'],
			['fr-CH', 'français'],
			['it-CH', 'italienne'],
		],

		'it-CH': [
			['type', 'TypI'],
			['from', 'VonI'],
			['fromPasslist', 'StationenI'],
			['arrivalTime', 'AnI'],
			['departureTime', 'AbI'],
			['toPasslist', 'StationenI'],
			['to', 'NachI'],
			['lock', 'lockI'],
			['de-CH', 'tedesco'],
			['fr-CH', 'francese'],
			['it-CH', 'italiano'],
		]
	},

	save: function () {
		if (typeof(Storage) !== "undefined") {
			localStorage.language = JSON.stringify(this.code);
		}
	},

	load: function() {
		if (typeof(Storage) !== "undefined") {
			if (localStorage.language) {
				this.code = JSON.parse(localStorage.language);
			}
		}
	},

	setCode: function (code) {
		let defaultCode = "de-CH";

		if(typeof this.sets[code] !== 'undefined') {	// check if a set with given code exists
			this.code = code;
		} else {
			this.code = defaultCode;
		}

		this.save();
	},

	parse: function () {
		let that = this;

		that.sets[that.code].forEach(function (entry) {
			document.getElementById(entry[0]).innerText = entry[1];
		});
	}
};