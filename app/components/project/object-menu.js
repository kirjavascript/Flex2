import { remote } from 'electron';
import { toJS } from 'mobx';
import { uuid } from '#util/uuid';
const { getCurrentWindow, Menu, MenuItem } = remote;

export default function(node) {
    const menu = new Menu();
    const index = node.parent.findIndex(d => d === node.ref);
    menu.append(new MenuItem({
        label: 'copy',
        click: () => {
            const clone = toJS(node.parent[index]);
            clone.uuid = uuid();
            node.parent.push(clone);
        },
    }));
    menu.append(new MenuItem({
        label: 'delete',
        click: () => {
            const message = node.children
                ? 'delete this folder and its descendents?'
                : 'delete this object?';
            if (confirm(message)) {
                node.parent.splice(index, 1);
            }
        },
    }));

    menu.popup(getCurrentWindow());
}
