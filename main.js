'use strict';

data.apiKey = apiKey;
stationBoard.data = data;
stationBoard.load(data, apiKey);

language.load();
document.querySelector("option[value="+language.code+"]").selected = true;		// set selected language
language.parse();

let transportationsEventHandler = function () {
    let transportations = [];

    let checkboxes = document.querySelectorAll("#transportations input:checked")
    for (let i = 0; i < checkboxes.length; i++) {
        transportations.push(checkboxes[i].value);
    }
    stationBoard.setTransportations(transportations);
}


/* ### transportations selection ### */
let checkboxNodes = document.querySelectorAll("#transportations input[type=checkbox]");
for (let k = 0; k < checkboxNodes.length; k++) {
    checkboxNodes[k].addEventListener("change", transportationsEventHandler);

	if(stationBoard.config.transportations.indexOf(checkboxNodes[k].value) !== -1) {					// set configuration from storage
		checkboxNodes[k].checked = "true"
	}
}

/* ### countdown ### */
let mql = window.matchMedia("(max-device-width : 480px)");

if (typeof mql === "object" && mql.matches === true) {
	document.getElementById("countdown").innerHTML = "";
} else {
	stationBoard.startCountdown();
}

// refresh on click on countdown
document.getElementById("countdown").addEventListener("click",
	() => stationBoard.load()
);

/* ### config menu ### */
document.getElementById("show_menu").addEventListener("click", function () {
    let config = document.getElementById("config");

	if(config.style.display === "initial") {
        config.style.display = "none";
	} else {
        config.style.display = "initial";
	}
});

document.getElementById("language").addEventListener("change", function (event) {
	language.setCode(this.value);
	language.parse();
});

document.getElementsByTagName("body")[0].addEventListener("click", function (event) {		// hide config
	const target = event.target;
	const name = target.localName;
	if(!(target.id === "show_menu" || name === "input" || name === "label" || name === "fieldset" || name === "select")) {
        document.getElementById("config").style.display = "none";
	}
});




