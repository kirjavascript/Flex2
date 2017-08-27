import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';

import { workspace } from '#store/workspace';

import { ProjectExplorer } from '#components/project/menu';
import { ProjectTree } from '#components/project/tree';

@observer
class Root extends React.Component {

    render() {
        return do {
            if (!workspace.projectPath) {
                <ProjectExplorer/>;
            }
            else {
                <div>
                    <ProjectTree/>
                </div>;
            }
        };
    }

}

render(<Root/>, document.body.appendChild(document.createElement('div')));
