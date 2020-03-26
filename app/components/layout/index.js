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

        if (component == 'project') {
            return <Project node={node}/>;
        } else if (component == 'palettes') {
            return <Palettes node={node}/>;
        } else if (component == 'art') {
            return <Art node={node}/>;
        } else if (component == 'sprites') {
            return <Sprites node={node}/>;
        } else if (component == 'mappings') {
            return <Mappings node={node}/>;
        } else if (component == 'documentation') {
            return <Documentation node={node}/>;
        }
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
