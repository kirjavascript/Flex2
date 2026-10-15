import { observable } from 'mobx';
import { keymap, modifierFromEvent } from '~/store/keymap';

export const inputState = observable({ multiplier: '', coarse: false });

document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (modifierFromEvent(e) === keymap.combo('coarse')) {
        inputState.coarse = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (modifierFromEvent(e) === keymap.combo('coarse')) {
        inputState.coarse = false;
    }
});

// the keyup never arrives if focus leaves while the key is held
window.addEventListener('blur', () => {
    inputState.coarse = false;
});

export const getDistance = () => {
    return inputState.coarse ? 8 : 1;
};
