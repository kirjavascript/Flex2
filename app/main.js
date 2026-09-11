// without this line, we cant run WASM without warnings
// the messages are hidden in prod, and we dont do network stuff anyway
window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

// flexlayout logs render errors it catches via console.debug, which devtools
// hides at default verbosity: promote those so they are actually visible
const debug = console.debug.bind(console);
console.debug = (...args) => {
    if (args.some((arg) => arg instanceof Error || arg?.componentStack)) {
        console.error(...args);
    } else {
        debug(...args);
    }
};

import './controls/keyboard';
import React from 'react';
import { render } from 'react-dom';
import { Layout } from '~/components/layout';
import './components/import';
import { configure } from 'mobx';

configure({
    enforceActions: 'never', // legacy design choice
});

render(
    <Layout/>,
    document.body.appendChild(document.createElement('div'))
);

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    return false;
}, false);

document.addEventListener('drop', (e) => {
    e.preventDefault();
    return false;
}, false);

// used in e2e tests
import { environment } from '~/store/environment';
import { workspace } from '~/store/workspace';
import { toJS } from 'mobx';
import { exportSprite } from '~/formats/image';
window.__test__ = { environment, workspace, toJS, exportSprite };
