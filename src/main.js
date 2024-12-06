import App from './Stationtable.svelte';

import {config} from './config';

const app = new App({
	target: document.body,
	props: {
		config
	}
});

export default app;