import React from 'react';
import { render } from 'react-dom';
import { Layout } from '#components/layout';
import packageJson from '../package.json';

import './controls/keyboard';
import './components/import';

import Analytics from 'electron-google-analytics';
const devMode = /node_modules[\\/]electron[\\/]/.test(process.execPath);
if (!devMode) {
    (new Analytics('UA-109903721-1'))
        .pageview('http://flex2.kirjava.xyz', `/${packageJson.version}`, 'Main View')
        .then((response) => { }).catch((err) => { });
}

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
