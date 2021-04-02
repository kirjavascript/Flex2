import Mousetrap from 'mousetrap';
import { environment } from '#store/environment';
import { commands } from './commands';
import flatten from 'lodash/flatten';

// load commands
flatten(commands)
    .forEach((obj) => {
        if (obj.hasShift) {
            Mousetrap.bind([obj.map, `shift+${obj.map}`], doCommand.bind(null, obj));
        }
        else {
            Mousetrap.bind(obj.map, doCommand.bind(null, obj));
        }
    });

// handle multiplier
let multiplier = '';
Mousetrap.bind([...'0123456789'], (e) => {
    multiplier += String(e.key);
});
Mousetrap.bind('esc', () => {
    multiplier = '';
});
function doCommand(obj, e) {
    environment.doAction(() => {
        if (!obj.noMultiplier && multiplier) {
            for (let i = 0; i < +multiplier; i++) obj.func(e);
            multiplier = '';
        }
        else {
            obj.func(e);
        }
    });
}
