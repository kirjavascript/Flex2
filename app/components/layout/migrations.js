import { MAPPINGS_LAYOUT, SETTINGS_LAYOUT, findNode } from './nodes';

// append new migrations at the end. ids must be unique, prefixed with the
// release they ship in. a layout with no or an unknown id runs all of them,
// so each must also be safe to run on a layout that already has the change
const migrations = [
    ['1.4.0 mappings sub-tabs', (layout) => {
        const mappingsNode = findNode((child) => child.component === 'mappings', layout.children);
        if (mappingsNode) Object.assign(mappingsNode, MAPPINGS_LAYOUT);
    }],
    ['1.6.0 settings tab', (layout) => {
        // settings moved from a modal to a tab, placed before Documentation
        if (findNode((child) => child.component === 'settings', layout.children)) return;
        const tabset = findNode(
            (child) => child.type === 'tabset'
                && child.children?.some((tab) => tab.component === 'documentation'),
            layout.children,
        ) || findNode((child) => child.type === 'tabset', layout.children);
        if (!tabset) return;
        const about = tabset.children.findIndex((tab) => tab.component === 'documentation');
        const at = about === -1 ? tabset.children.length : about;
        tabset.children.splice(at, 0, { ...SETTINGS_LAYOUT });
        if (tabset.selected >= at) tabset.selected++;
    }],
    ['1.6.0 documentation tab', (layout) => {
        const tab = findNode((child) => child.component === 'documentation', layout.children);
        if (tab) tab.name = 'Documentation';
    }],
];

const VERSION_KEY = 'layout-version';

// the version is only ever written alongside the layout, so a stored layout
// never claims migrations it didn't get
export function saveLayout(json) {
    localStorage.setItem('layout', JSON.stringify(json));
    localStorage.setItem(VERSION_KEY, migrations[migrations.length - 1][0]);
}

export function migrate(rawModel) {
    const applied = migrations.findIndex(([id]) => id === localStorage.getItem(VERSION_KEY));
    const pending = migrations.slice(applied + 1);
    pending.forEach(([, run]) => run(rawModel.layout));
    if (pending.length) saveLayout(rawModel);
}
