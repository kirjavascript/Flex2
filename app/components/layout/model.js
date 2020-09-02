import FlexLayout from 'flexlayout-react';

let fileMenu;

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
                    // fileMenu = {
                    //     'type': 'tab',
                    //     'name': 'File',
                    //     'component': 'file',
                    //     'id': '#11',
                    // },
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

const recurse = (children, callback) => {
    children.forEach(child => {
        callback(child, children);
        if (child.children) {
            recurse(child.children, callback);
        }
    });
};

const migrations = [
    (layout) => {
        layout.global.tabSetEnableMaximize = true;
    },
    // (layout) => {
    //     recurse([layout.layout], (node, parent) => {
    //         if (node.component === 'project') {
    //             parent.unshift(fileMenu);
    //         }
    //     });
    // },
];

let savedLayout = localStorage.getItem('layout');
let version = +localStorage.getItem('layout-version')
    // if we have a layout but no version we are adding layout-version & migrating
    // otherwise, we have a fresh install and can consider having the latest version
    || (savedLayout ? 0 : migrations.length);

if (savedLayout && version < migrations.length) {
    const layout = JSON.parse(savedLayout);
    migrations
        .slice(version)
        .forEach((migration, i) => {
            console.info(`Layout migration #${i + version}`);
            migration(layout);
            version++;
        });
    const migrated = JSON.stringify(layout)
    localStorage.setItem('layout', migrated);
    savedLayout = migrated;
    localStorage.setItem('layout-version', version);
}

export const model = savedLayout
    ?  FlexLayout.Model.fromJson(JSON.parse(savedLayout))
    : FlexLayout.Model.fromJson(DEFAULT_LAYOUT);

export function saveModel(model) {
    localStorage.setItem('layout', JSON.stringify(model.toJson()));
}

window.resetLayout = () => {
    localStorage.setItem('layout', '');
    localStorage.setItem('layout-version', '');
    window.location.reload();
};
