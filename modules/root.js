import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';

import { workspace } from '#store/workspace';

import { ProjectExplorer } from '#components/project/menu';
import { Layout } from '#components/layout';

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

document.addEventListener('dragover',function(event){
    event.preventDefault();
    return false;
},false);

document.addEventListener('drop',function(event){
    event.preventDefault();
    return false;
},false);
