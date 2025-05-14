import Stationtable from './Stationtable.svelte';

import {config} from './config.js';
import {Data} from './data.js';
import {requestParser} from "./requestParser.js";
import {mount} from "svelte";

const data = new Data(config, requestParser);

const API_KEY = location.pathname.slice(1);
config.API_KEY = API_KEY;

mount(Stationtable, {
	target: document.body,
	props: {
		config,
		data,
		requestParser
	}
})