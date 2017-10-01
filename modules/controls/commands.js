import { environment } from '#store/environment';
import { mappingState } from '#components/mappings/state';
import { undo, redo } from '#store/history';
import { getDistance } from './distance';
import { toJS } from 'mobx';

/*
 * mod = ctrl / cmd
 *
 * Mouse:
 *
 * left + outside = select
 * left + inside = drag
 * double left = toggle
 * right + outside = pan
 * wheel = zoom
 */

export const commands = [

    [
        {
            map: 'mod+a', name: 'Select All',
            func: () => { mappingState.selectAll(); },
        },
        {
            map: 'mod+d', name: 'Select None',
            func: () => { mappingState.selectNone(); },
        },
    ],
    [
        {
            map: 'h', name: 'Horizontal Flip', color: 'green',
            func: (e) => {
                const { x } = mappingState.center || {};
                mappingState.mutateActive((mapping) => {
                    mapping.hflip = !mapping.hflip;
                    const xOffset = mapping.left + (mapping.width * 8 / 2) - x;
                    mapping.left = - xOffset - (mapping.width * 8 / 2) + x;
                });
            },
        },
        {
            map: 'v', name: 'Vertical Flip', color: 'green',
            func: (e) => {
                const { y } = mappingState.center || {};
                mappingState.mutateActive((mapping) => {
                    mapping.vflip = !mapping.vflip;
                    const yOffset = mapping.top + (mapping.height * 8 / 2) - y;
                    mapping.top = - yOffset - (mapping.height * 8 / 2) + y;
                });
            },
        },
    ],

    [
        {
            map: 'left', name: 'Move Left', hasShift: true, color: 'white',
            func: () => {
                mappingState.mutateActive((mapping) => {
                    mapping.left -= getDistance();
                });
            },
        },
        {
            map: 'right', name: 'Move Right', hasShift: true, color: 'white',
            func: () => {
                mappingState.mutateActive((mapping) => {
                    mapping.left += getDistance();
                });
            },
        },
        {
            map: 'up', name: 'Move Up', hasShift: true, color: 'white',
            func: (e) => {
                e && e.preventDefault();
                mappingState.mutateActive((mapping) => {
                    mapping.top -= getDistance();
                });
            },
        },
        {
            map: 'down', name: 'Move Down', hasShift: true, color: 'white',
            func: (e) => {
                e && e.preventDefault();
                mappingState.mutateActive((mapping) => {
                    mapping.top += getDistance();
                });
            },
        },
    ],
    [
        {
            map: 'n s', name: 'Add New Sprite', color: 'green',
            func: () => {
                const { currentSprite, dplcsEnabled } = environment.config;
                environment.mappings.splice(currentSprite+1, 0, []);
                dplcsEnabled &&
                environment.dplcs.splice(currentSprite+1, 0, []);
                environment.config.currentSprite++;
            },
        },
        {
            map: 'c', name: 'Clone Sprite', color: 'green',
            func: () => {
                const { currentSprite, dplcsEnabled } = environment.config;
                const { mappings, dplcs } = environment.currentSprite;
                environment.mappings.splice(currentSprite+1, 0, toJS(mappings));
                dplcsEnabled &&
                environment.dplcs.splice(currentSprite+1, 0, toJS(dplcs));
            },
        },
    ],

    [
        {
            map: 'f', name: 'Toggle Priority', color: 'orange',
            func: (e) => {
                mappingState.mutateActive((mapping) => {
                    mapping.priority = !mapping.priority;
                });
            },
        },
        {
            map: 'p', name: 'Shift Palette', color: 'orange',
            func: (e) => {
                mappingState.mutateActive((mapping) => {
                    mapping.palette = (mapping.palette+1) % 4;
                });
            },
        },
    ],


    [
        {
            map: 'd s', name: 'Delete Sprite', color: 'red',
            func: () => {
                const { currentSprite, dplcsEnabled } = environment.config;
                environment.mappings.splice(currentSprite, 1);
                environment.dplcs.splice(currentSprite, 1);
            },
        },
        {
            map: 'd m', name: 'Delete Selected', color: 'red',
            func: () => {
                const { selectedIndicies, hasActive } = mappingState;
                const { currentSprite, dplcsEnabled } = environment;
                if (hasActive) {
                    selectedIndicies.forEach((i) => {
                        currentSprite.mappings[i].rip = true;
                    });
                    currentSprite.mappings.replace(
                        currentSprite.mappings.filter((d) => !d.rip)
                    );
                    mappingState.selectedIndicies.replace([]);
                    mappingState.deleteUnusedDPLCs();
                }
            },
        },
    ],

    [
        {
            map: 'mod+z', name: 'Undo', color: 'magenta',
            func: () => { undo(); },
        },
        {
            map: 'mod+r', name: 'Redo', color: 'magenta',
            func: () => { redo(); },
        },
    ],
    [
        {
            map: ']', name: 'Next Sprite', color: 'yellow', hasShift: true,
            func: () => { environment.config.currentSprite += getDistance(); },
        },
        {
            map: '[', name: 'Previous Sprite', color: 'yellow', hasShift: true,
            func: () => { environment.config.currentSprite -= getDistance(); },
        },
        {
            map: 'home', name: 'First Sprite', color: 'yellow',
            func: () => { environment.config.currentSprite = 0; },
        },
        {
            map: 'end', name: 'Last Sprite', color: 'yellow',
            func: () => { environment.config.currentSprite = Infinity; },
        },
    ],

    [
        {
            map: 't', name: 'Transparency', color: 'magenta',
            func: () => { environment.config.transparency = !environment.config.transparency; },
        },
        {
            map: '=', name: 'Reset Pan/Zoom', color: 'magenta',
            func: () => { mappingState.resetPanAndZoom(); },
        },
        {
            map: 'g', name: 'Guidelines', color: 'magenta',
            func: () => { mappingState.guidelines.enabled = !mappingState.guidelines.enabled; },
        },
    ],




    [
        {
            map: 'u a', name: 'Unload Art', color: 'red',
            func: () => { environment.tiles.replace([]); },
        },
        {
            map: 'u m', name: 'Unload Mappings', color: 'red',

            func: () => { environment.mappings.replace([]); },
        },
        {
            map: 'u d', name: 'Unload DPLCs', color: 'red',
            func: () => { environment.dplcs.replace([]); },
        },
        {
            map: 'u p', name: 'Unload Palettes', color: 'red',
            func: () => { environment.resetPalettes(); },
        },
    ],
];
