import { keymap, modifierFromEvent } from '~/store/keymap';

let distance = 1;

document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (modifierFromEvent(e) === keymap.combo('coarse')) {
        distance = 8;
    }
});

document.addEventListener('keyup', (e) => {
    if (modifierFromEvent(e) === keymap.combo('coarse')) {
        distance = 1;
    }
});

export const getDistance = () => {
    return distance;
};
