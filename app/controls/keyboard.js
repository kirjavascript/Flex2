import Mousetrap from 'mousetrap';
import { autorun } from 'mobx';
import { environment } from '~/store/environment';
import { keymap } from '~/store/keymap';
import { commands } from './commands';
import { mappingState } from '~/components/mappings/state';
import flatten from 'lodash/flatten';

const defaultStopCallback = Mousetrap.prototype.stopCallback;
Mousetrap.prototype.stopCallback = function (...args) {
    return keymap.recording || defaultStopCallback.apply(this, args);
};

let multiplier = '';

function doCommand(obj, e) {
    environment.doAction(() => {
        if (!obj.noMultiplier && multiplier) {
            const count = Math.min(+multiplier, 999);
            for (let i = 0; i < count; i++) obj.func(e);
            multiplier = '';
        }
        else {
            obj.func(e);
        }
    });
}

autorun(() => {
    const handlers = new Map();
    const add = (combo, fn) => {
        if (!combo) return;
        if (!handlers.has(combo)) handlers.set(combo, []);
        handlers.get(combo).push(fn);
    };

    const coarse = keymap.combo('coarse');
    flatten(commands).forEach((obj) => {
        const combo = keymap.combo(obj.id);
        const run = (e) => doCommand(obj, e);
        add(combo, run);
        if (obj.hasShift && coarse) add(`${coarse}+${combo}`, run);
    });
    add('esc', () => {
        multiplier = '';
        mappingState.closeModals();
    });

    Mousetrap.reset();
    [...'0123456789'].forEach((digit) => Mousetrap.bind(digit, (e) => {
        if (e.repeat) return;
        if (e.key === '0' && !multiplier) return;
        if (multiplier.length < 3) multiplier += String(e.key);
    }));
    handlers.forEach((fns, combo) => {
        Mousetrap.bind(combo, (e) => { fns.forEach((fn) => fn(e)); });
    });
});
