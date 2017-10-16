import { autorun, toJS } from 'mobx';
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import { environment } from './environment';

const maxHistory = 1000;
let past = [];
let now = void 0;
let future = [];
let timeTravelling = false;

export function initHistory() {

    autorun(() => {

        const { config, palettes, mappings, dplcs, tiles } = environment;
        // traverse everything we want to react to...
        const { currentSprite } = config;
        tiles.forEach((a) => {a.forEach((b) => {b;});});
        palettes.forEach((a) => {a.forEach((b) => {b;});});
        mappings.forEach((a) => {a.forEach((b) => Object.values(b));});
        dplcs.forEach((a) => {a.forEach((b) => Object.values(b));});

        !timeTravelling && addHistory();

    });

}

function getCurrent() {
    const { config, palettes, mappings, dplcs, tiles } = toJS(environment);

    return {
        currentSprite: config.currentSprite,
        palettes, mappings, tiles, dplcs,
    };
}

function setCurrent() {
    const { currentSprite, palettes, mappings, tiles, dplcs } = now;
    environment.doAction(() => {
        environment.config.currentSprite = currentSprite;
        environment.palettes.replace(palettes);
        environment.mappings.replace(mappings);
        environment.tiles.replace(tiles);
        environment.dplcs.replace(dplcs);
    });
}

const addHistory = debounce(() => {

    const { config, palettes, mappings, dplcs, tiles } = environment;

    now && past.push(now);

    now = getCurrent();

    future = [];

    if (past.length >= maxHistory) {
        past.shift();
    }

}, 200);

export const undo = throttle(() => {
    timeTravelling = true;

    if (past.length) {
        future.push(now);

        now = past.pop();

        setCurrent();
    }

    timeTravelling = false;
}, 100);

export const redo = throttle(() => {
    timeTravelling = true;

    if (future.length) {
        past.push(now);

        now = future.pop();

        setCurrent();
    }

    timeTravelling = false;
}, 100);
