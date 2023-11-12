import { Model, Actions } from 'flexlayout-react';

window.resetLayout = () => {
    localStorage.removeItem('layout');
    window.location.reload();
};

const MAPPINGS_LAYOUT = {
    type: 'tab',
    name: 'Mappings',
    component: 'sub',
    config: {
        model: {
            global: {
                tabSetTabLocation: 'bottom',
                splitterSize: 6,
                tabEnableClose: false,
                tabEnableRename: false,
            },
            borders: [],
            layout: {
                type: 'row',
                children: [
                    {
                        type: 'tabset',
                        weight: 50,
                        children: [
                            {
                                type: 'tab',
                                name: 'Visual',
                                component: 'mappings-visual',
                            },
                            {
                                type: 'tab',
                                name: 'Raw',
                                component: 'mappings-raw',
                            },
                        ],
                    },
                ],
            },
        },
    },
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
                    {
                        type: 'tab',
                        name: 'About',
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

// migrations

const mappingsNode = findNode(
    (child) => child.component === 'mappings',
    rawModel.layout.children,
);

if (mappingsNode) {
    Object.assign(mappingsNode, MAPPINGS_LAYOUT);
}

function findNode(cond, children) {
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (cond(child)) return child;
        if (child.children) {
            const result = findNode(cond, child.children);
            if (result) return result;
        }
    }
}

export const model = Model.fromJson(rawModel);

export function saveModel(model) {
    localStorage.setItem('layout', JSON.stringify(model.toJson()));
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
