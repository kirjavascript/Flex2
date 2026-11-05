export const MAPPINGS_LAYOUT = {
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
                tabSetEnableMaximize: false,
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
                                name: 'Data',
                                component: 'mappings-raw',
                            },
                        ],
                    },
                ],
            },
        },
    },
};

export const SETTINGS_LAYOUT = {
    type: 'tab',
    name: 'Settings',
    component: 'settings',
};

export function findNode(cond, children) {
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (cond(child)) return child;
        if (child.children) {
            const result = findNode(cond, child.children);
            if (result) return result;
        }
    }
}
