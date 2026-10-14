import { observable, action, makeObservable } from 'mobx';
import { storage } from './storage';

const isMac = /Mac/.test(navigator.platform);

// keys outside the command list
export const generalBindings = [
    { id: 'coarse', name: 'Coarse Step (hold)', map: 'shift', modifier: true },
];

const named = {
    Escape: 'esc', Enter: 'enter', ' ': 'space', '+': 'plus',
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    Backspace: 'backspace', Tab: 'tab', Delete: 'del', Insert: 'ins',
    Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown',
};
const modifierKeys = { Shift: 'shift', Control: 'ctrl', Alt: 'alt', Meta: 'meta' };

// one key press in Mousetrap syntax, or undefined for a lone modifier. typed
// characters keep their shifted form ('E', '<') like the default bindings
export function eventToKey(e) {
    if (modifierKeys[e.key]) return undefined;
    const key = named[e.key] || (/^F\d+$/.test(e.key) ? e.key.toLowerCase() : e.key);
    const mods = [];
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (mod) mods.push('mod');
    if (e.ctrlKey && isMac) mods.push('ctrl');
    if (e.metaKey && !isMac) mods.push('meta');
    if (e.altKey) mods.push('alt');
    const char = key.length === 1;
    if (e.shiftKey && (!char || mods.length)) mods.push('shift');
    return [...mods, mods.length && char ? key.toLowerCase() : key].join('+');
}

export const modifierFromEvent = (e) => modifierKeys[e.key];

class Keymap {
    overrides = {};
    recording = false;
    defaults = {};

    constructor() {
        makeObservable(this, {
            overrides: observable,
            recording: observable,
            setRecording: action,
            set: action,
            reset: action,
            resetAll: action,
        });
        this.register(generalBindings);
    }

    register = (bindings) => {
        bindings.forEach(({ id, map }) => { this.defaults[id] = map; });
    };

    combo = (id) => (id in this.overrides ? this.overrides[id] : this.defaults[id]) || '';

    // while a key is being recorded no binding fires
    setRecording = (value) => { this.recording = value; };

    set = (id, combo) => { this.overrides[id] = combo; };
    reset = (id) => { delete this.overrides[id]; };
    resetAll = () => { Object.keys(this.overrides).forEach(this.reset); };
}

export const keymap = new Keymap();
storage(keymap, 'keymap', ['overrides']);
