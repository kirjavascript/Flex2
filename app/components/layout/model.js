import FlexLayout, { Actions } from 'flexlayout-react';

window.resetLayout = () => {
    localStorage.removeItem('layout');
    localStorage.removeItem('layout-version');
    window.location.reload();
};

const DEFAULT_LAYOUT = {
    'global': {
        'splitterSize': 6,
        'tabEnableClose': false,
        'tabEnableRename': false,
        'tabSetEnableMaximize': true
    },
    'layout': {
        'type': 'row',
        'children': [
            {
                'type': 'tabset',
                'weight': 16.5,
                'children': [
                    {
                        'type': 'tab',
                        'name': 'Art',
                        'component': 'art',
                    },
                    {
                        'type': 'tab',
                        'name': 'Palettes',
                        'component': 'palettes',
                    }
                ]
            },
            {
                'type': 'tabset',
                'weight': 67,
                'selected': 0,
                'children': [
                    {
                        'type': 'tab',
                        'name': 'File',
                        'component': 'file',
                    },
                    {
                        'type': 'tab',
                        'name': 'Project',
                        'component': 'project',
                    },
                    {
                        'type': 'tab',
                        'name': 'Mappings',
                        'component': 'mappings',
                    },
                    {
                        'type': 'tab',
                        'name': 'Documentation',
                        'component': 'documentation',
                    },
                ],
                'active': true
            },
            {
                'type': 'tabset',
                'weight': 20.4,
                'children': [
                    {
                        'type': 'tab',
                        'name': 'Sprites',
                        'component': 'sprites',
                    },
                ],
            },
        ],
    },
};

const savedLayout = localStorage.getItem('layout');
const version = +localStorage.getItem('layout-version')
if (!version) {
    localStorage.setItem('layout-version', 1);
}

function findNode(name, children) {
    if (!name) return;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.name === name) return child;
        if (child.children) {
            const result = findNode(name, child.children);
            if (result) return result;
        }
    }
}

export const model = version && savedLayout
    ? FlexLayout.Model.fromJson(JSON.parse(savedLayout))
    : FlexLayout.Model.fromJson(DEFAULT_LAYOUT);


export function saveModel(model) {
    localStorage.setItem('layout', JSON.stringify(model.toJson()));
}

export function selectTab(name) {
    model.doAction(
        Actions.selectTab(
            findNode(name, model.toJson().layout.children).id,
        ),
    );
}
