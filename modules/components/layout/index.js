import React, { Component } from 'react';
import { model, saveModel } from './model';

import FlexLayout from 'flexlayout-react';

import { ProjectConfig } from '#components/project/config';

export class Layout extends Component {

    factory = (node) => {
        let component = node.getComponent();
        saveModel();

        return do {
            if (component == 'project') {
                <ProjectConfig/>;
            }
        };
    }

    render() {
        return (
            <FlexLayout.Layout
                model={model}
                factory={this.factory}
            />
        );
    }

}
