import Mousetrap from 'mousetrap';
import { autorun } from 'mobx';
import { environment } from '~/store/environment';
import { keymap } from '~/store/keymap';
import { commands } from './commands';
import { mappingState } from '~/components/mappings/state';
import { inputState } from './distance';
import flatten from 'lodash/flatten';

const defaultStopCallback = Mousetrap.prototype.stopCallback;
Mousetrap.prototype.stopCallback = function (...args) {
    return keymap.recording || defaultStopCallback.apply(this, args);
};

function doCommand(obj, e) {
    environment.doAction(() => {
        if (!obj.noMultiplier && inputState.multiplier) {
            const count = Math.min(+inputState.multiplier, 999);
            for (let i = 0; i < count; i++) obj.func(e);
            inputState.multiplier = '';
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
        if (keymap.blocked(combo)) return;
        const run = (e) => doCommand(obj, e);
        add(combo, run);
        if (obj.hasShift && coarse) add(`${coarse}+${combo}`, run);
    });
    add('esc', () => {
        inputState.multiplier = '';
        mappingState.closeModals();
    });

    Mousetrap.reset();
    if (keymap.counts) {
        [...'0123456789'].forEach((digit) => Mousetrap.bind(digit, (e) => {
            if (e.repeat) return;
            if (e.key === '0' && !inputState.multiplier) return;
            if (inputState.multiplier.length < 3) inputState.multiplier += String(e.key);
        }));
    } else {
        inputState.multiplier = '';
    }
    handlers.forEach((fns, combo) => {
        Mousetrap.bind(combo, (e) => { fns.forEach((fn) => fn(e)); });
    });
});
