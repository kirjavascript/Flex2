import Mousetrap from 'mousetrap';
import { environment } from '#store/environment';
import { commands } from './commands';
import flatten from 'lodash/flatten';

// load commands
flatten(commands)
    .forEach((obj) => {
        if (obj.hasShift) {
            Mousetrap.bind([obj.map, `shift+${obj.map}`], () => doCommand(obj));
        }
        else {
            Mousetrap.bind(obj.map, () => doCommand(obj));
        }
    });

// handle multiplier
let multiplier = '';
Mousetrap.bind(['0','1','2','3','4','5','6','7','8','9'], (e) => {
    multiplier += String(e.key);
});
Mousetrap.bind('esc', () => {
    multiplier = '';
});
function doCommand(obj) {
    environment.doAction(() => {
        if (!obj.noMultiplier && multiplier) {
            for (let i = 0; i < +multiplier; i++) obj.func();
            multiplier = '';
        }
        else {
            obj.func();
        }
    });
}
