<script>
    const {config, data, requestParser} = $props();

    let trains = $state();

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
        if (estimatedTime !== undefined && scheduledTime !== undefined) {
            const delayMs = estimatedTime - scheduledTime;
            return Math.floor(delayMs / 60000);
        }
        return 0;
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

        const journey = train.journeyRef.split(":");
        const journeyNumber = journey.pop();

        if (journeyNumber === '') return undefined

        return `${config.MIKU_LINK}/#/fahrten/direkt/${journeyNumber}`;
    }

</script>

<main>
    <form>
        <table id="arrivals" class="stationtable">
            <colgroup class="arrival">
                <col class="platform" />
                <col class="type" />
                <col class="from" />
                <col class="passlist"/>
                <col class="arrival_time"/>
            </colgroup>
            <colgroup>
                <col class="departure_time"/>
                <col class="passlist"/>
                <col class="to"/>
            </colgroup>
            <thead>
            <tr>
                <th >#</th>
                <th id="type" class="type">Zug</th>
                <th id="from">Von</th>
                <th id="fromPasslist" class="passlist">Stationen</th>
                <th id="arrivalTime">An</th>
                <th id="departureTime" >Ab</th>
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
                            class:delay="{getDelay(train.estimatedArrivalTime, train.arrivalTime) !== 0}">
                            {formatTime(train.arrivalTime)}
                        </td>
                        <td class="departure_time departure"
                            class:delay="{getDelay(train.estimatedDepartureTime, train.departureTime) !== 0}"
                            class:cancelled="{train.departureCancelled}">
                            {formatTime(train.departureTime)}
                            {#if getDelay(train.estimatedDepartureTime, train.departureTime) !== 0}
                                +{getDelay(train.estimatedDepartureTime, train.departureTime)}
                            {/if}
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
    <p id="version">solari.hirschengraben.net v0.6.0</p>
</main>