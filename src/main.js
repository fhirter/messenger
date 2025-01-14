import Stationtable from './Stationtable.svelte';

import {config} from './config.js';
import {Data} from './data.js';
import {requestParser} from "./requestParser.js";

const data = new Data(config, requestParser);

const app = new Stationtable({
	target: document.body,
	props: {
		config,
		data,
		requestParser
	}
});

export default app;