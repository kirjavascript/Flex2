import FlexLayout from 'flexlayout-react';

window.resetLayout = () => {
    localStorage.setItem('layout', null);
    localStorage.setItem('layout-version', null);
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
        'id': '#1',
        'children': [
            {
                'type': 'tabset',
                'weight': 16.5,
                'id': '#13',
                'children': [
                    {
                        'type': 'tab',
                        'name': 'Art',
                        'component': 'art',
                        'id': '#5'
                    },
                    {
                        'type': 'tab',
                        'name': 'Palettes',
                        'component': 'palettes',
                        'id': '#4'
                    }
                ]
            },
            {
                'type': 'tabset',
                'weight': 67,
                'selected': 0,
                'id': '#2',
                'children': [
                    {
                        'type': 'tab',
                        'name': 'File',
                        'component': 'file',
                        'id': '#14',
                    },
                    {
                        'type': 'tab',
                        'name': 'Project',
                        'component': 'project',
                        'id': '#3',
                    },
                    {
                        'type': 'tab',
                        'name': 'Mappings',
                        'component': 'mappings',
                        'id': '#7',
                    },
                    {
                        'type': 'tab',
                        'name': 'Documentation',
                        'component': 'documentation',
                        'id': '#8',
                    },
                ],
                'active': true
            },
            {
                'type': 'tabset',
                'weight': 20.4,
                'id': '#10',
                'children': [
                    {
                        'type': 'tab',
                        'name': 'Sprites',
                        'component': 'sprites',
                        'id': '#6'
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

export const model = version && savedLayout
    ? FlexLayout.Model.fromJson(JSON.parse(savedLayout))
    : FlexLayout.Model.fromJson(DEFAULT_LAYOUT);


export function saveModel(model) {
    localStorage.setItem('layout', JSON.stringify(model.toJson()));
}
