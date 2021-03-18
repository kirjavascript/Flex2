import { autorun, toJS } from 'mobx';
import throttle from 'lodash/throttle';
import { environment } from './environment';

const maxHistory = 1000;
let past = [];
let now = undefined;
let future = [];
let timeTravelling = false;

export function initHistory() {

    autorun(() => {

        const { config, palettes, mappings, dplcs, tiles } = environment;
        // traverse everything we want to react to...
        config.dplcsEnabled;
        tiles.forEach((a) => a.forEach((b) => b));
        palettes.forEach((a) => a.forEach((b) => b));
        mappings.forEach((a) => a.forEach((b) => Object.values(b)));
        dplcs.forEach((a) => a.forEach((b) => Object.values(b)));

        !timeTravelling && addHistory();

    }, { delay: 200 });

}

function getCurrent() {
    const { config, palettes, mappings, dplcs, tiles } = toJS(environment);

    return {
        dplcsEnabled: config.dplcsEnabled,
        palettes, mappings, tiles, dplcs,
    };
}

function setCurrent() {
    const { dplcsEnabled, palettes, mappings, tiles, dplcs } = now;
    environment.doAction(() => {
        environment.config.dplcsEnabled = dplcsEnabled;
        environment.palettes.replace(palettes);
        environment.mappings.replace(mappings);
        environment.tiles.replace(tiles);
        environment.dplcs.replace(dplcs);
    });
}

const addHistory = () => {
    console.log('add history');
    now && past.push(now);

    now = getCurrent();

    future = [];

    if (past.length >= maxHistory) {
        past.shift();
    }
};

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
