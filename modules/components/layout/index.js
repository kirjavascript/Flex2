import React, { Component } from 'react';
import { model, saveModel } from './model';

import FlexLayout from 'flexlayout-react';

import { Project } from '#components/project';
import { Palettes } from '#components/palettes';
import { Art } from '#components/art/index';
import { Sprites } from '#components/sprites';
import { Mappings } from '#components/mappings';
import { Documentation } from '#components/documentation';

export class Layout extends Component {

    factory = (node) => {
        let component = node.getComponent();
        saveModel();

        return node._visible && do {
            if (component == 'project') {
                <Project node={node}/>;
            }
            else if (component == 'palettes') {
                <Palettes node={node}/>;
            }
            else if (component == 'art') {
                <Art node={node}/>;
            }
            else if (component == 'sprites') {
                <Sprites node={node}/>;
            }
            else if (component == 'mappings') {
                <Mappings node={node}/>;
            }
            else if (component == 'documentation') {
                <Documentation node={node}/>;
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
