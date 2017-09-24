import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';

import { workspace } from '#store/workspace';
import { ProjectExplorer } from '#components/project/menu';
import { Layout } from '#components/layout';

import './keyboard';

@observer
class Root extends React.Component {

    render() {
        return do {
            if (!workspace.projectPath) {
                <ProjectExplorer/>;
            }
            else {
                <Layout/>;
            }
        };
    }

}

render(
    <Root/>,
    document.body.appendChild(document.createElement('div'))
);

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    return false;
},false);

document.addEventListener('drop', (e) => {
    e.preventDefault();
    return false;
},false);
