import { environment } from '#store/environment';
import { mappingState } from '#components/mappings/state';
import { importState } from '#components/import/state';
import { undo, redo } from '#store/history';
import { exportPNG, importImg } from '#formats/image';
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
 *
 * drawing mode;
 * left = chosen pixel
 * right = chosen pixel
 *
 * Input / Select;
 *
 * esc = blur
 * up/down = add/subtract
 * wheel = add/subtract
 */

export function getCommandLabel(name) {
    if (name == '[mode]') {
        return mappingState.mode == 'drawing' ? 'Mapping Mode' : 'Drawing Mode';
    } else if (name == '[dplcs]') {
        return environment.config.dplcsEnabled ? 'Disable DPLCs' : 'Enable DPLCs';
    } else {
        return name;
    }
}

export const commands = [

    [
        {
            map: 'f12', name: 'DevTools', hidden: true,
            func: () => {
                require('electron').remote
                    .getCurrentWindow()
                    .webContents
                    .toggleDevTools();
            },
        },
        {
            map: 'n s', name: 'New Sprite', color: 'green',
            func: () => {
                const { currentSprite, dplcsEnabled } = environment.config;
                environment.mappings.splice(currentSprite+1, 0, []);
                dplcsEnabled &&
                environment.dplcs.splice(currentSprite+1, 0, []);
                environment.config.currentSprite++;
            },
        },
        {
            map: 'n m', name: 'New Mapping', color: 'green',
            func: () => {
                mappingState.newMapping.active = !mappingState.newMapping.active;
            },
        },
        {
            map: 'n t', name: 'New Tile', color: 'green', count: true,
            func: () => {
                environment.tiles.push(
                    Array.from({length: 64}).fill((0|Math.random()*15)+1)
                );
            },
        },
        {
            map: 'c s', name: 'Clone Sprite', color: 'green',
            func: () => {
                const { currentSprite, dplcsEnabled } = environment.config;
                const { mappings, dplcs } = environment.currentSprite;
                environment.mappings.splice(currentSprite+1, 0, toJS(mappings));
                dplcsEnabled &&
                environment.dplcs.splice(currentSprite+1, 0, toJS(dplcs));
            },
        },
        {
            map: 'c t', name: 'Clone Sprite & Tiles', color: 'green',
            func: () => {
                const { tiles, config, doAction } = environment;
                const { currentSprite, dplcsEnabled } = config;
                const { mappings, dplcs } = environment.currentSprite;
                doAction(() => {
                    if (dplcsEnabled) {
                        const newDPLCs = toJS(dplcs);
                        newDPLCs.forEach((dplc) => {
                            for (let i = 0; i < dplc.size; i++) {
                                tiles.push(toJS(tiles[dplc.art + i]));
                            }
                            dplc.art = tiles.length - dplc.size;
                        });
                        environment.dplcs.splice(currentSprite+1, 0, newDPLCs);
                        environment.mappings.splice(currentSprite+1, 0, toJS(mappings));
                    }
                    else {
                        const newMappings = toJS(mappings);
                        newMappings.forEach((mapping) => {
                            const size = mapping.width * mapping.height;
                            for (let i = 0; i < size; i++) {
                                tiles.push(toJS(tiles[mapping.art + i]));
                            }
                            mapping.art = tiles.length - size;
                        });
                        environment.mappings.splice(currentSprite+1, 0, newMappings);
                    }
                });
            },
        },
    ],

    [
        {
            map: 'mod+a', name: 'Select All', noMultiplier: true,
            func: () => { mappingState.selectAll(); },
        },
        {
            map: 'mod+d', name: 'Select None', noMultiplier: true,
            func: () => { mappingState.selectNone(); },
        },
    ],
    [
        {
            map: 'h', name: 'Horizontal Flip', color: 'orange',
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
            map: 'v', name: 'Vertical Flip', color: 'orange',
            func: (e) => {
                const { y } = mappingState.center || {};
                mappingState.mutateActive((mapping) => {
                    mapping.vflip = !mapping.vflip;
                    const yOffset = mapping.top + (mapping.height * 8 / 2) - y;
                    mapping.top = - yOffset - (mapping.height * 8 / 2) + y;
                });
            },
        },
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
            map: 'e', name: 'Export PNG', color: 'blue', noMultiplier: true,
            func: () => {
                exportPNG();
            },
        },
        {
            map: 'i', name: 'Import Over Sprite', color: 'blue', noMultiplier: true,
            func: () => {
                importImg();
            },
        },
        {
            map: 's', name: 'Import Spritesheet', color: 'blue', noMultiplier: true,
            func: () => {
                importState.newImport();
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
            map: 'd m', name: 'Delete Mappings', color: 'red',
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
                    mappingState.optimizeCurrentDPLCs();
                }
            },
        },
        {
            map: 'd u', name: 'Delete Unused Tiles', color: 'red', noMultiplier: true,
            func: () => {
                mappingState.deleteUnusedTiles();
            },
        },
    ],



    [
        {
            map: 'mod+z', name: 'Undo', color: 'magenta', noMultiplier: true,
            func: () => { undo(); },
        },
        {
            map: 'mod+r', name: 'Redo', color: 'magenta', noMultiplier: true,
            func: () => { redo(); },
        },
    ],

    [
        {
            map: 'r', name: 'Raw Editor', color: 'white', noMultiplier: true,
            func: () => {
                mappingState.rawEditor.active = !mappingState.rawEditor.active;
            },
        },
    ],

    [
        {
            map: 'm', name: '[mode]', color: 'orange', noMultiplier: true,
            func: () => {
                mappingState.toggleMode();
            },
        },
        {
            map: 'D', name: '[dplcs]', color: 'orange', noMultiplier: true,
            func: () => {
                mappingState.toggleDPLCs();
            },
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
            map: '<', name: 'First Sprite', color: 'yellow', noMultiplier: true,
            func: () => { environment.config.currentSprite = 0; },
        },
        {
            map: '>', name: 'Last Sprite', color: 'yellow', noMultiplier: true,
            func: () => { environment.config.currentSprite = environment.mappings.length -1; },
        },
    ],

    [
        {
            map: 'A', name: 'Autoarrange Tiles', color: 'yellow', noMultiplier: true,
            func: () => { mappingState.arrangeTilesBySpriteOrder(); },
        },
    ],


    [
        {
            map: 'u a', name: 'Unload Art', color: 'red', noMultiplier: true,
            func: () => { environment.tiles.replace([]); },
        },
        {
            map: 'u m', name: 'Unload Mappings', color: 'red', noMultiplier: true,
            func: () => {
                environment.mappings.replace([]);
                environment.config.dplcsEnabled &&
                environment.dplcs.replace([]);
            },
        },
        {
            map: 'u p', name: 'Unload Palettes', color: 'red', noMultiplier: true,
            func: () => { environment.resetPalettes(); },
        },
    ],

    [
        {
            map: 't', name: 'Transparency', color: 'magenta', noMultiplier: true,
            func: () => { environment.config.transparency = !environment.config.transparency; },
        },
        {
            map: '=', name: 'Reset Pan/Zoom', color: 'magenta', noMultiplier: true,
            func: () => { mappingState.resetPanAndZoom(); },
        },
        {
            map: 'g', name: 'Guidelines', color: 'magenta', noMultiplier: true,
            func: () => { mappingState.guidelines.enabled = !mappingState.guidelines.enabled; },
        },
    ],

];
