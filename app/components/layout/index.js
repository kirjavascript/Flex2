import React, { Component } from 'react';
import { model, saveModel } from './model';

import FlexLayout from 'flexlayout-react';
import classNames from 'classnames';

import { Project } from '#components/project';
import { Palettes } from '#components/palettes';
import { Art } from '#components/art/index';
import { Sprites } from '#components/sprites';
import { Mappings } from '#components/mappings';
import { Documentation } from '#components/documentation';

const getPanel = (component, node) => {
    if (component === 'project') {
        return <Project node={node}/>;
    } else if (component === 'palettes') {
        return <Palettes node={node}/>;
    } else if (component === 'art') {
        return <Art node={node}/>;
    } else if (component === 'sprites') {
        return <Sprites node={node}/>;
    } else if (component === 'mappings') {
        return <Mappings node={node}/>;
    } else if (component === 'documentation') {
        return <Documentation node={node}/>;
    }
};

export class Layout extends Component {

    factory = (node) => {
        const component = node.getComponent();
        const maximized = !!node.getModel().getMaximizedTabset();
        return (
            <div className={classNames([
                'flexlayout_panel',
                maximized && 'flexlayout__panel_maximized',
            ])}>
                { getPanel(component, node) }
            </div>
        );
    }

    render() {
        return (
            <FlexLayout.Layout
                model={model}
                factory={this.factory}
                onModelChange={saveModel}
            />
        );
    }

}
