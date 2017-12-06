import React from 'react';
import { render } from 'react-dom';
import { Layout } from '#components/layout';

import './controls/keyboard';
import './components/import';

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
