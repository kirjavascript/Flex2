import FlexLayout from 'flexlayout-react';

const DEFAULT_LAYOUT = {
    'global': {
        'splitterSize': 6,
        'tabEnableClose': false,
        'tabEnableRename': false,
        'tabSetEnableMaximize': false
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
                    {
                        'type': 'tab',
                        'name': 'Animations',
                        'component': 'animations',
                        'id': '#9',
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

export const model = do {
    if (savedLayout) {
        FlexLayout.Model.fromJson(JSON.parse(savedLayout));
    }
    else {
        FlexLayout.Model.fromJson(DEFAULT_LAYOUT);
    }
};

export function saveModel() {
    localStorage.setItem('layout', JSON.stringify(model.toJson()));
}
