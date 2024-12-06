import App from './Stationtable.svelte';

import {config} from './config.js';
import {data} from './data.js';
import {requestParser} from "./requestParser.js";

const app = new App({
	target: document.body,
	props: {
		config,
		data,
		requestParser
	}
});

export default app;