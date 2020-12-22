
let transportationsEventHandler = function (event) {
    let transportations = [];

    let checkboxes = document.querySelectorAll("#transportations input:checked")
    for (let i = 0; i < checkboxes.length; i++) {
        transportations.push(checkboxes[i].value);
    }
    stationBoardView.setTransportations(transportations);
}


/* ### transportations selection ### */
let checkboxNodes = document.querySelectorAll("#transportations input[type=checkbox]");
for (let k = 0; k < checkboxNodes.length; k++) {
    checkboxNodes[k].addEventListener("change", transportationsEventHandler);

    if(stationBoardView.config.transportations.indexOf(checkboxNodes[k].value) !== -1) {					// set configuration from storage
        checkboxNodes[k].checked = "true"
    }
}

// config menu
document.getElementById("show_menu").addEventListener("click", function () {
    let config = document.getElementById("config");

    if(config.style.display === "initial") {
        config.style.display = "none";
    } else {
        config.style.display = "initial";
    }
});

// language menu change
document.getElementById("language").addEventListener("change", function (event) {
    translation.setCode(this.value);
    translation.parse();
});


// close menu
document.getElementsByTagName("body")[0].addEventListener("click", function (event) {		// hide config
    const target = event.target;
    const name = target.localName;
    if(!(target.id === "show_menu" || name === "input" || name === "label" || name === "fieldset" || name === "select")) {
        document.getElementById("config").style.display = "none";
    }
});