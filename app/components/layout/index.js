import React, { Component } from 'react';
import { model, saveModel } from './model';

import { Layout as FlexLayout, Model, Actions } from 'flexlayout-react';
import classNames from 'classnames';

import { File } from '#components/file';
import { Project } from '#components/project';
import { Palettes } from '#components/palettes';
import { Art } from '#components/art/index';
import { Sprites } from '#components/sprites';
import { Mappings } from '#components/mappings';
import { Documentation } from '#components/documentation';

export class Layout extends Component {
    factory = (node) => {
        const model = node.getModel();
        const maximized = !!model.getMaximizedTabset();
        return (
            <div
                className={classNames([
                    'flexlayout__panel',
                    maximized && 'flexlayout__panel_maximized',
                ])}
            >
                {(() => {
                    const component = node.getComponent();
                    if (!node._visible) return false;
                    if (component === 'file') {
                        return <File node={node} />;
                    } else if (component === 'project') {
                        return <Project node={node} />;
                    } else if (component === 'palettes') {
                        return <Palettes node={node} />;
                    } else if (component === 'art') {
                        return <Art node={node} />;
                    } else if (component === 'sprites') {
                        return <Sprites node={node} />;
                    } else if (component === 'mappings') {
                        return <Mappings node={node} />;
                    } else if (component === 'documentation') {
                        return <Documentation node={node} />;
                    }

                    if (component === 'sub') {
                        let subModel = node.getExtraData().model;
                        if (subModel == null) {
                            node.getExtraData().model = Model.fromJson(
                                node.getConfig().model,
                            );
                            subModel = node.getExtraData().model;
                        }

                        return (
                            <FlexLayout
                                model={subModel}
                                factory={this.factory}
                                onModelChange={() => {
                                    node.getConfig().model = node
                                        .getExtraData()
                                        .model.toJson();
                                    saveModel(model);
                                }}
                            />
                        );
                    }
                    return 'No such component ' + component;
                })()}
            </div>
        );
    };

    render() {
        return (
            <FlexLayout
                model={model}
                factory={this.factory}
                onModelChange={saveModel}
            />
        );
    }
}
