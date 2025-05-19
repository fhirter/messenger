import Stationtable from './Stationtable.svelte';

import {config} from './config.js';
import {Data} from './data.js';
import {requestParser} from "./requestParser.js";
import {mount} from "svelte";
import {OjpApiRepository} from "./OjpApiRepository.js";

const apiKeyLength = 200;

fetch("/key")
    .then(res => res.text())
    .then(key => {
        if (key.length === 0) throw new Error("No API Key specified!");
        if (key.length > apiKeyLength) throw new Error("API Key is too long!");
        if (typeof key !== "string") throw new Error('key is not a string!')

        const apiRepository = new OjpApiRepository({
            apiKey: key,
            limit: config.limit,
            station: config.station,
        });

        const data = new Data(apiRepository, requestParser);

        mount(Stationtable, {
            target: document.body,
            props: {
                config,
                data,
                requestParser
            }
        })
    });

