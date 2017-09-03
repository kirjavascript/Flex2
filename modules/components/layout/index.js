import React, { Component } from 'react';
import { model, saveModel } from './model';

import FlexLayout from 'flexlayout-react';

import { ProjectConfig } from '#components/project/config';
import { Palettes } from '#components/palettes';
import { Art } from '#components/art';
import { Sprites } from '#components/sprites';
import { Mappings } from '#components/mappings';
import { DPLCs } from '#components/dplcs';

export class Layout extends Component {

    factory = (node) => {
        let component = node.getComponent();
        saveModel();

        return node._visible && do {
            if (component == 'project') {
                <ProjectConfig/>;
            }
            else if (component == 'palettes') {
                <Palettes/>;
            }
            else if (component == 'art') {
                <Art/>;
            }
            else if (component == 'sprites') {
                <Sprites/>;
            }
            else if (component == 'mappings') {
                <Mappings/>;
            }
            else if (component == 'dplcs') {
                <DPLCs/>;
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
