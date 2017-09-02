import FlexLayout from 'flexlayout-react';

const DEFAULT_LAYOUT = {
    global: {
        splitterSize: 6,
        tabEnableClose: false,
        tabEnableRename: false,
        // enableEdgeDock: false,
        tabSetEnableMaximize: false,
    },
    borders: [],
    layout: {
        'type': 'row',
        'weight': 100,
        'children': [
            {
                'type': 'tabset',
                'weight': 100,
                'selected': 0,
                'children': [
                    {
                        'type': 'tab',
                        'name': 'Project',
                        'component':'project',
                    },
                    {
                        'type': 'tab',
                        'name': 'Palettes',
                        'component':'grid',
                    },
                    {
                        'type': 'tab',
                        'name': 'Art',
                        'component':'grid',
                    },
                    {
                        'type': 'tab',
                        'name': 'Sprites',
                        'component':'grid',
                    },
                    {
                        'type': 'tab',
                        'name': 'Mappings',
                        'component':'grid',
                    },
                    {
                        'type': 'tab',
                        'name': 'DPLCs',
                        'component':'grid',
                    },
                ]
            },
        ]
    }
};

const savedLayout = localStorage.getItem('layout');

export const model = do {
    if (false && savedLayout) {
        FlexLayout.Model.fromJson(JSON.parse(savedLayout));
    }
    else {
        FlexLayout.Model.fromJson(DEFAULT_LAYOUT);
    }
};

export function saveModel() {
    localStorage.setItem('layout', JSON.stringify(model.toJson()));
}
