// without this line, we cant run WASM without warnings
// the messages are hidden in prod, and we dont do network stuff anyway
window.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

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
import { mappingState } from '~/components/mappings/state';
import { toJS } from 'mobx';
import { exportSprite, spritesheetCanvas } from '~/formats/image';
import { keymap } from '~/store/keymap';
import { importState } from '~/components/import/state';
import { importSprite, generateSpriteMappings, commonPixels, padded } from '~/components/import/import-sprite';
import { generateMappings } from '~/components/import/generate-mappings';
import { generateInWorker } from '~/components/import/worker-client';
window.__test__ = {
    environment, workspace, mappingState, toJS, exportSprite, spritesheetCanvas, keymap,
    importState, importSprite, generateSpriteMappings, commonPixels, padded,
    generateMappings, generateInWorker,
};
