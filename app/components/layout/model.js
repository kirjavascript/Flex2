import { Model, Actions } from 'flexlayout-react';
import { MAPPINGS_LAYOUT, SETTINGS_LAYOUT, findNode } from './nodes';
import { migrate, saveLayout } from './migrations';

window.resetLayout = () => {
    localStorage.removeItem('layout');
    localStorage.removeItem('layout-version');
    window.location.reload();
};

const DEFAULT_LAYOUT = {
    global: {
        splitterSize: 6,
        tabEnableClose: false,
        tabEnableRename: false,
        tabSetEnableMaximize: true,
    },
    layout: {
        type: 'row',
        children: [
            {
                type: 'tabset',
                weight: 16.5,
                children: [
                    {
                        type: 'tab',
                        name: 'Art',
                        component: 'art',
                    },
                    {
                        type: 'tab',
                        name: 'Palettes',
                        component: 'palettes',
                    },
                ],
            },
            {
                type: 'tabset',
                weight: 67,
                selected: 0,
                children: [
                    {
                        type: 'tab',
                        name: 'File',
                        component: 'file',
                    },
                    {
                        type: 'tab',
                        name: 'Project',
                        component: 'project',
                    },
                    MAPPINGS_LAYOUT,
                    SETTINGS_LAYOUT,
                    {
                        type: 'tab',
                        name: 'Documentation',
                        component: 'documentation',
                    },
                ],
            },
            {
                type: 'tabset',
                weight: 20.4,
                children: [
                    {
                        type: 'tab',
                        name: 'Sprites',
                        component: 'sprites',
                    },
                ],
            },
        ],
    },
};

const savedLayout = localStorage.getItem('layout');

const rawModel = savedLayout ? JSON.parse(savedLayout) : DEFAULT_LAYOUT;

// the default layout is already current
if (savedLayout) migrate(rawModel);

export const model = Model.fromJson(rawModel);

export function saveModel(model) {
    saveLayout(model.toJson());
}

export function selectTab(name) {
    model.doAction(
        Actions.selectTab(
            findNode(
                (child) => child.name === name,
                model.toJson().layout.children,
            ).id,
        ),
    );
}
