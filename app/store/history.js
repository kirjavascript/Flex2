import { autorun, toJS } from 'mobx';

import { environment } from './environment';

const maxHistory = 1000;
const past = [];
const future = [];
let now;
let timeTravelling = false;
let drawingActive = false;

export function initHistory() {
    autorun(() => {
        const { config, palettes, mappings, dplcs, art, spriteMetadata } = environment;
        // traverse everything we want to react to...
        config.dplcsEnabled;
        art.forEach(({ base, tiles }) => { base; tiles.forEach((a) => a.forEach((b) => b)); });
        palettes.forEach((a) => a.forEach((b) => b));
        mappings.forEach((a) => a.forEach((b) => Object.values(b)));
        dplcs.forEach((a) => a.forEach((b) => Object.values(b)));
        spriteMetadata.forEach((a) => Object.values(a));

        addHistory();
    }, { delay: 200 });
}

function getCurrent() {
    const { config, palettes, mappings, dplcs, art, spriteMetadata } = toJS(environment);

    return {
        dplcsEnabled: config.dplcsEnabled,
        palettes, mappings, art, dplcs, spriteMetadata,
    };
}

function setCurrent() {
    const { dplcsEnabled, palettes, mappings, art, dplcs, spriteMetadata } = now;
    environment.doAction(() => {
        environment.config.dplcsEnabled = dplcsEnabled;
        environment.palettes.replace(palettes);
        environment.mappings.replace(mappings);
        environment.spriteMetadata.replace(spriteMetadata);
        environment.setArt(art);
        environment.dplcs.replace(dplcs);
    });
}

export function setDrawing(active) {
    if (!active && drawingActive) {
        drawingActive = false;
        addHistory();
        return;
    }
    drawingActive = active;
}

const addHistory = () => {
    if (drawingActive) {
        return;
    }
    if (timeTravelling) {
        timeTravelling = false;
    } else {
        const current = getCurrent();
        // skip if state hasn't changed (e.g. duplicate autorun after a drawing stroke)
        if (now && JSON.stringify(now) === JSON.stringify(current)) {
            return;
        }

        now && past.push(now);
        now = current;

        future.splice(0, future.length);

        if (past.length >= maxHistory) {
            past.shift();
        }
    }
};

export const undo = () => {
    timeTravelling = true;

    if (past.length) {
        future.push(now);

        now = past.pop();

        setCurrent();
    }
};

export const redo = () => {
    timeTravelling = true;

    if (future.length) {
        past.push(now);

        now = future.pop();

        setCurrent();
    }
};
