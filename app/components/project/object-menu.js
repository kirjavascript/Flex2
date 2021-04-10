import { toJS } from 'mobx';
import { uuid } from '#util/uuid';
import { workspace } from '#store/workspace';
const { getCurrentWindow, Menu, MenuItem } = require('@electron/remote');

export default function(node) {
    const menu = new Menu();
    const index = node.parent.findIndex(d => d === node.ref);
    menu.append(new MenuItem({
        label: node.name,
        enabled: false,
    }));
    const type = node.isDirectory ? 'folder' : 'object';
    if (!node.isDirectory) {
        menu.append(new MenuItem({
            label: 'copy to file menu',
            click: () => workspace.projectToFile(node.ref),
        }));
    }
    menu.append(new MenuItem({
        label: 'copy ' + type,
        click: () => {
            const clone = toJS(node.parent[index]);
            clone.uuid = uuid();
            node.parent.splice(index, 0, clone);
        },
    }));
    menu.append(new MenuItem({
        label: 'delete ' + type,
        submenu: [
            new MenuItem({
                label: 'confirm',
                click: () => {
                    node.parent.splice(index, 1);
                },
            })
        ],
    }));
    menu.popup(getCurrentWindow());
}
