import { remote } from 'electron';
import { toJS } from 'mobx';
import { uuid } from '#util/uuid';
const { getCurrentWindow, Menu, MenuItem } = remote;

export default function(node) {
    const menu = new Menu();
    const index = node.parent.findIndex(d => d === node.ref);
    menu.append(new MenuItem({
        label: 'copy',
        // role: 'copy',
        click: () => {
            const clone = toJS(node.parent[index]);
            clone.uuid = uuid();
            node.parent.splice(index, 0, clone);
        },
    }));
    menu.append(new MenuItem({
        label: 'delete',
        // role: 'delete',
        submenu: [
            new MenuItem({
                label: 'confirm delete',
                click: () => {
                    node.parent.splice(index, 1);
                },
            })
        ],
    }));
    menu.popup(getCurrentWindow());
}
