import { environment } from '#store/environment';
import { mappingState } from '#components/mappings/state';
import { undo, redo } from '#store/history';
import Mousetrap from 'mousetrap';

// mod = ctrl / cmd

let distance = 1;

document.addEventListener('keydown', (e) => {
    if (e.key == 'Shift') {
        distance = 8;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key == 'Shift') {
        distance = 1;
    }
});

// make controls folder, document mouse with commands
// pass getDistance() to comamnds on map
// support hasshift

export const commands = [
    {
        map: 'mod+z', name: 'Undo',
        func: () => { undo(); },
    },
    {
        map: 'mod+r', name: 'Redo',
        func: () => { redo(); },
    },

    {
        map: '=', name: 'Reset Pan/Zoom',
        func: () => { mappingState.resetPanAndZoom(); },
    },
    {
        map: 'mod+a', name: 'Select All',
        func: () => { mappingState.selectAll(); },
    },
    {
        map: 'mod+d', name: 'Select None',
        func: () => { mappingState.selectNone(); },
    },

    {
        map: 'u a', name: 'Unload Art',
        func: () => { environment.tiles.replace([]); },
    },
    {
        map: 'u m', name: 'Unload Mappings',
        func: () => { environment.mappings.replace([]); },
    },
    {
        map: 'u d', name: 'Unload DPLCs',
        func: () => { environment.dplcs.replace([]); },
    },
    {
        map: 'd s', name: 'Delete Sprite',
        func: () => {
            const { currentSprite, dplcsEnabled } = environment.config;
            environment.mappings.splice(currentSprite, 1);
            environment.dplcs.splice(currentSprite, 1);
        },
    },

    {
        map: ']', name: 'Next Sprite',
        func: () => { environment.config.currentSprite++; },
    },
    {
        map: '[', name: 'Previous Sprite',
        func: () => { environment.config.currentSprite--; },
    },

    {
        map: 'left', name: 'Move Left',
        func: () => {
            mappingState.mutateActive((mapping) => {
                mapping.left -= distance;
            });
        },
    },
    {
        map: 'right', name: 'Move Right',
        func: () => {
            mappingState.mutateActive((mapping) => {
                mapping.left += distance;
            });
        },
    },
    {
        map: 'up', name: 'Move Up',
        func: (e) => {
            e && e.preventDefault();
            mappingState.mutateActive((mapping) => {
                mapping.top -= distance;
            });
        },
    },
    {
        map: ['down', 'shift+down'], name: 'Move Down',
        func: (e) => {
            e && e.preventDefault();
            mappingState.mutateActive((mapping) => {
                mapping.top += distance;
            });
        },
    },
];

commands.forEach(({map, func}) => {
    Mousetrap.bind(map, func);
});

// cut, paste

/*
 * [] = nav sprite
 * {} = nav tile
 * arrows = move piece(s)
 * shift = *8 (applies when dragging too?)


replicate flex1 behaviour
set priority
change palette < >
guidelines
delete unused art (get buffers list)
num = toggle mapping piece on / off ?
dupe frame / mappings
add frame
drag
grid: 8
guidelines
priority
export to png
*/
