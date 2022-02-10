<script>
    export let trains = [];

    load();

    if(config.MIKU_LINK.length === 0) {
        console.log("No Miku URL specified!");
    }

    setInterval(() => {
        load();
    }, config.refreshRate*10000)

    function load() {
        data.setConfig(config);			// set configuration for data object
        data.load(requestParser).then((data) => {
            trains = data;
        });
    }

    function formatTime(date, formatString) {
        let hours, minutes, time;
        if(formatString === undefined) {
            formatString = "HH:mm";
        }
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
    }

    function getDelay(estimatedTime, scheduledTime) {
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
    }

    function parsePasslist(passlist) {
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

    function getMikuUrl(train) {
        if(
            config.MIKU_LINK === ''
            || train === undefined
            || train.journeyRef === ''
        ) {
            return undefined;
        }

        let journeyNumber = '';
        let journey = train.journeyRef.split(":");
        journeyNumber = journey.pop();

        if (journeyNumber !== '') {
            let infoUrl = config.MIKU_LINK + "/#/fahrten/direkt/" +journeyNumber;
            return infoUrl;
            let lineLink = document.createElement('a');

            lineLink.setAttribute('href', infoUrl);
            lineLink.setAttribute('target', "_blank");
            lineLink.innerHTML = train.lineName;
        } else {
            return undefined;
        }
    }

</script>

<main>
    <form>
        <table id="arrivals" class="stationtable">
            <colgroup class="arrival">
                <col />
                <col />
                <col />
                <col />
                <col />
            </colgroup>
            <colgroup>
                <col />
                <col />
                <col />
                <col />
            </colgroup>
            <thead>
            <tr>
                <th>#</th>
                <th id="type" class="type">Zug</th>
                <th id="from">Von</th>
                <th id="fromPasslist" class="passlist">Stationen</th>
                <th id="arrivalTime">Ankunftszeit</th>
                <th id="departureTime">Abfahrtszeit</th>
                <th id="toPasslist" class="passlist">Stationen</th>
                <th id="to">Nach</th>
            </tr>
            </thead>
            <tbody>
            {#await trains}
                <p>awaiting...</p>
            {:then trains}
                {#each trains as train}
                    <tr>
                        <td class="platform"
                            class:delay="{train.changedPlatform}"
                        >
                            {train.platform}
                        </td>
                        <td class="type">
                            <a href="{getMikuUrl(train)}" target="_blank">{train.type}</a>
                        </td>
                        <td class="from"
                            class:cancelled="{train.arrivingCancelled}">
                            {train.from}
                        </td>
                        <td class="passlist"
                            class:cancelled="{train.arrivingCancelled}">
                            {parsePasslist(train.fromPasslist)}
                        </td>
                        <td class="arrival_time"
                            class:delay="{getDelay(train.estimatedArrivalTime, train.arrivalTime)>0}">
                            {formatTime(train.arrivalTime)}
                        </td>
                        <td class="departure_time departure"
                            class:delay="{getDelay(train.estimatedDepartureTime, train.departureTime)>0}"
                            class:cancelled="{train.departureCancelled}">
                            {formatTime(train.departureTime)}
                        </td>
                        <td class="passlist departure"
                            class:cancelled="{train.departureCancelled}">
                            {parsePasslist(train.toPasslist)}
                        </td>
                        <td class="to departure"
                            class:cancelled="{train.departureCancelled}">
                            {train.to}
                        </td>
                    </tr>
                {/each}
            {:catch error}
                <p>error</p>
            {/await}
            </tbody>
        </table>
    </form>
    <p id="version">fabianhirter.ch/messenger v0.5</p>
</main>