import App from './Stationtable.svelte';

import {config} from './config.js';
import {data} from './data.js';

const app = new App({
	target: document.body,
	props: {
		config,
		data
	}
});

export default app;