import Stationtable from './Stationtable.svelte';

import {config} from './config.js';
import {Data} from './data.js';
import {requestParser} from "./requestParser.js";
import {mount} from "svelte";

const apiKeyLength = 200;

const data = new Data(config, requestParser);

fetch("/key")
    .then(res => res.text())
    .then(key => {
        if (typeof key === "string" && key.length < apiKeyLength) {
            config.API_KEY = key;
        }

        mount(Stationtable, {
            target: document.body,
            props: {
                config,
                data,
                requestParser
            }
        })
    });

