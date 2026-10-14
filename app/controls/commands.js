import { environment } from '~/store/environment';
import { mappingState } from '~/components/mappings/state';
import { importState } from '~/components/import/state';
import { undo, redo } from '~/store/history';
import { exportPNG, importImg, exportSpritesheet } from '~/formats/image';
import { getDistance } from './distance';
import { toJS } from 'mobx';
import { keymap } from '~/store/keymap';

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
    if (name === '[mode]') {
        return mappingState.mode === 'drawing' ? 'Mapping Mode' : 'Drawing Mode';
    } else if (name === '[dplcs]') {
        return environment.config.dplcsEnabled ? 'Disable DPLCs' : 'Enable DPLCs';
    } else {
        return name;
    }
}

export const commands = [
    [
        {
            id: 'newSprite', map: 'n s', name: 'New Sprite', color: 'green',
            func: () => {
                const { currentSprite, dplcsEnabled } = environment.config;
                environment.mappings.splice(currentSprite+1, 0, []);
                dplcsEnabled &&
                environment.dplcs.splice(currentSprite+1, 0, []);
                environment.spriteMetadata.splice(currentSprite+1, 0, {});
                environment.config.currentSprite++;
            },
        },
        {
            id: 'newMapping', map: 'n m', name: 'New Mapping', color: 'green',
            func: () => {
                mappingState.toggleNewMapping();
            },
        },
        {
            id: 'newTile', map: 'n t', name: 'New Tile', color: 'green', count: true,
            func: () => {
                environment.appendTiles([
                    Array.from({length: 64}).fill((0|Math.random()*15)+1)
                ]);
            },
        },
        {
            id: 'cloneSprite', map: 'c s', name: 'Clone Sprite', color: 'green',
            func: () => {
                const { currentSprite, dplcsEnabled } = environment.config;
                const { mappings, dplcs } = environment.currentSprite;
                environment.mappings.splice(currentSprite+1, 0, toJS(mappings));
                dplcsEnabled &&
                environment.dplcs.splice(currentSprite+1, 0, toJS(dplcs));
                const meta = toJS(environment.spriteMetadata[currentSprite] || {});
                delete meta.label;
                delete meta.plcLabel;
                environment.spriteMetadata.splice(currentSprite+1, 0, meta);
            },
        },
        {
            id: 'cloneSpriteTiles', map: 'c t', name: 'Clone Sprite & Tiles', color: 'green',
            func: () => {
                const { tiles, config, doAction } = environment;
                const { currentSprite, dplcsEnabled } = config;
                const { mappings, dplcs } = environment.currentSprite;
                doAction(() => {
                    // cloned tiles go on the end of the bank being worked on
                    const cloneTiles = (art, size) => {
                        const start = environment.nextTile;
                        environment.appendTiles(
                            Array.from({length: size}, (_, i) => toJS(tiles[art + i])),
                        );
                        return start;
                    };

                    if (dplcsEnabled) {
                        const newDPLCs = toJS(dplcs);
                        newDPLCs.forEach((dplc) => {
                            dplc.art = cloneTiles(dplc.art, dplc.size);
                        });
                        environment.dplcs.splice(currentSprite+1, 0, newDPLCs);
                        environment.mappings.splice(currentSprite+1, 0, toJS(mappings));
                        const meta = toJS(environment.spriteMetadata[currentSprite] || {});
                        delete meta.label;
                        delete meta.plcLabel;
                        environment.spriteMetadata.splice(currentSprite+1, 0, meta);
                    }
                    else {
                        const newMappings = toJS(mappings);
                        newMappings.forEach((mapping) => {
                            mapping.art = cloneTiles(
                                mapping.art,
                                mapping.width * mapping.height,
                            );
                        });
                        environment.mappings.splice(currentSprite+1, 0, newMappings);
                        const meta = toJS(environment.spriteMetadata[currentSprite] || {});
                        delete meta.label;
                        delete meta.plcLabel;
                        environment.spriteMetadata.splice(currentSprite+1, 0, meta);
                    }
                });
            },
        },
    ],

    [
        {
            id: 'selectAll', map: 'mod+a', name: 'Select All', noMultiplier: true,
            func: () => { mappingState.selectAll(); },
        },
        {
            id: 'selectNone', map: 'mod+d', name: 'Select None', noMultiplier: true,
            func: () => { mappingState.selectNone(); },
        },
    ],
    [
        {
            id: 'hflip', map: 'h', name: 'Horizontal Flip', color: 'orange',
            func: () => {
                const { x } = mappingState.center || {};
                mappingState.mutateActive((mapping) => {
                    mapping.hflip = !mapping.hflip;
                    const xOffset = mapping.left + (mapping.width * 8 / 2) - x;
                    mapping.left = - xOffset - (mapping.width * 8 / 2) + x;
                });
            },
        },
        {
            id: 'vflip', map: 'v', name: 'Vertical Flip', color: 'orange',
            func: () => {
                const { y } = mappingState.center || {};
                mappingState.mutateActive((mapping) => {
                    mapping.vflip = !mapping.vflip;
                    const yOffset = mapping.top + (mapping.height * 8 / 2) - y;
                    mapping.top = - yOffset - (mapping.height * 8 / 2) + y;
                });
            },
        },
        {
            id: 'priority', map: 'f', name: 'Toggle Priority', color: 'orange',
            func: () => {
                mappingState.mutateActive((mapping) => {
                    mapping.priority = !mapping.priority;
                });
            },
        },
        {
            id: 'palette', map: 'p', name: 'Shift Palette', color: 'orange',
            func: () => {
                mappingState.mutateActive((mapping) => {
                    mapping.palette = (mapping.palette+1) % 4;
                });
            },
        },
    ],

    [
        {
            id: 'moveLeft', map: 'left', name: 'Move Left', hasShift: true, color: 'white',
            func: () => {
                mappingState.mutateActive((mapping) => {
                    mapping.left -= getDistance();
                });
            },
        },
        {
            id: 'moveRight', map: 'right', name: 'Move Right', hasShift: true, color: 'white',
            func: () => {
                mappingState.mutateActive((mapping) => {
                    mapping.left += getDistance();
                });
            },
        },
        {
            id: 'moveUp', map: 'up', name: 'Move Up', hasShift: true, color: 'white',
            func: (e) => {
                mappingState.hasActive && e.preventDefault();
                mappingState.mutateActive((mapping) => {
                    mapping.top -= getDistance();
                });
            },
        },
        {
            id: 'moveDown', map: 'down', name: 'Move Down', hasShift: true, color: 'white',
            func: (e) => {
                mappingState.hasActive && e.preventDefault();
                mappingState.mutateActive((mapping) => {
                    mapping.top += getDistance();
                });
            },
        },
    ],

    [
        {
            id: 'exportImage', map: 'e', name: 'Export Image', color: 'blue', noMultiplier: true,
            func: () => exportPNG(),
        },
        {
            id: 'exportSpritesheet', map: 'E', name: 'Export Spritesheet', color: 'blue', noMultiplier: true,
            func: () => exportSpritesheet(),
        },
        {
            id: 'importImage', map: 'i', name: 'Import Image', color: 'blue', noMultiplier: true,
            func: () => importImg(),
        },
        {
            id: 'importSpritesheet', map: 's', name: 'Import Spritesheet', color: 'blue', noMultiplier: true,
            func: () => importState.newImport(),
        },
    ],



    [
        {
            id: 'deleteSprite', map: 'd s', name: 'Delete Sprite', color: 'red',
            func: () => {
                const { currentSprite } = environment.config;
                environment.mappings.splice(currentSprite, 1);
                environment.dplcs.splice(currentSprite, 1);
                environment.spriteMetadata.splice(currentSprite, 1);
            },
        },
        {
            id: 'deleteMappings', map: 'd m', name: 'Delete Mappings', color: 'red',
            func: () => {
                const { selectedIndices, hasActive } = mappingState;
                const { currentSprite } = environment;
                if (hasActive) {
                    selectedIndices.forEach((i) => {
                        currentSprite.mappings[i].rip = true;
                    });
                    currentSprite.mappings.replace(
                        currentSprite.mappings.filter((d) => !d.rip)
                    );
                    mappingState.selectedIndices.replace([]);
                    mappingState.optimizeCurrentDPLCs();
                }
            },
        },
        {
            id: 'deleteUnusedTiles', map: 'd u', name: 'Delete Unused Tiles', color: 'red', noMultiplier: true,
            func: () => {
                mappingState.deleteUnusedTiles();
            },
        },

    ],



    [
        {
            id: 'undo', map: 'mod+z', name: 'Undo', color: 'magenta', noMultiplier: true,
            func: () => { undo(); },
        },
        {
            id: 'redo', map: 'mod+r', name: 'Redo', color: 'magenta', noMultiplier: true,
            func: () => { redo(); },
        },
    ],

    [
        {
            id: 'rotate', map: 'R', name: 'Rotate Sprite', color: 'white', noMultiplier: true,
            func: () => {
                mappingState.toggleRotate();
            },
        },
    ],

    [
        {
            id: 'mode', map: 'm', name: '[mode]', color: 'orange', noMultiplier: true,
            func: () => {
                mappingState.toggleMode();
            },
        },
        {
            id: 'dplcs', map: 'D', name: '[dplcs]', color: 'orange', noMultiplier: true,
            func: () => {
                mappingState.toggleDPLCs();
            },
        },
    ],


    [
        {
            id: 'prevSprite', map: '[', name: 'Previous Sprite', color: 'yellow', hasShift: true,
            func: () => { environment.config.currentSprite -= getDistance(); },
        },
        {
            id: 'nextSprite', map: ']', name: 'Next Sprite', color: 'yellow', hasShift: true,
            func: () => { environment.config.currentSprite += getDistance(); },
        },
        {
            id: 'swapPrev', map: 'mod+[', name: 'Swap Previous', color: 'yellow', hasShift: true,
            func: () => {
                const { currentSprite } = environment.config;
                if (currentSprite > 0) {
                    environment.swapSprite(currentSprite, currentSprite - 1);
                    environment.config.currentSprite = currentSprite - 1;
                }
            },
        },
        {
            id: 'swapNext', map: 'mod+]', name: 'Swap Next', color: 'yellow', hasShift: true,
            func: () => {
                const { currentSprite } = environment.config;
                if (currentSprite < environment.mappings.length - 1) {
                    environment.swapSprite(currentSprite, currentSprite + 1);
                    environment.config.currentSprite = currentSprite + 1;
                }
            },
        },
        {
            id: 'firstSprite', map: '<', name: 'First Sprite', color: 'yellow', noMultiplier: true,
            func: () => { environment.config.currentSprite = 0; },
        },
        {
            id: 'lastSprite', map: '>', name: 'Last Sprite', color: 'yellow', noMultiplier: true,
            func: () => { environment.config.currentSprite = environment.mappings.length -1; },
        },
    ],

    [
        {
            id: 'autoarrange', map: 'A', name: 'Autoarrange Tiles', color: 'yellow', noMultiplier: true,
            func: () => { mappingState.arrangeTilesBySpriteOrder(); },
        },
    ],


    [
        {
            id: 'unloadArt', map: 'u a', name: 'Unload Art', color: 'red', noMultiplier: true,
            func: () => { environment.clearArt(); },
        },
        {
            id: 'unloadMappings', map: 'u m', name: 'Unload Mappings', color: 'red', noMultiplier: true,
            func: () => {
                environment.mappings.replace([]);
                environment.spriteMetadata.replace([]);
                environment.config.dplcsEnabled &&
                environment.dplcs.replace([]);
            },
        },
        {
            id: 'unloadPalettes', map: 'u p', name: 'Unload Palettes', color: 'red', noMultiplier: true,
            func: () => { environment.resetPalettes(); },
        },
        {
            id: 'unloadEverything', map: 'u e', name: 'Unload Everything', color: 'red', noMultiplier: true,
            func: () => {
                environment.clearArt();
                environment.mappings.replace([]);
                environment.spriteMetadata.replace([]);
                environment.config.dplcsEnabled &&
                environment.dplcs.replace([]);
                environment.resetPalettes();
            },
        },
    ],

    [
        {
            id: 'transparency', map: 't', name: 'Transparency', color: 'magenta', noMultiplier: true,
            func: () => { environment.config.transparency = !environment.config.transparency; },
        },
        {
            id: 'resetPanZoom', map: '=', name: 'Reset Pan/Zoom', color: 'magenta', noMultiplier: true,
            func: () => { mappingState.resetPanAndZoom(); },
        },
        {
            id: 'guidelines', map: 'g', name: 'Guidelines', color: 'magenta', noMultiplier: true,
            func: () => { mappingState.guidelines.enabled = !mappingState.guidelines.enabled; },
        },
    ],

];

keymap.register(commands.flat());
