import { observable, computed, action, autorun } from 'mobx';
import range from 'lodash/range';
import unique from 'lodash/uniq';
import { storage } from './storage';
import { initHistory } from './history';
import { defaultPalettes } from '#formats/palette';
import arrayMove from 'array-move';

class Environment {

    @observable config = {
        currentSprite: 0,
        currentTile: 0,
        transparency: true,
        dplcsEnabled: false,
    };

    // palettes must use colours of the form #NNN
    @observable palettes = defaultPalettes;

    @observable tiles = [
        // each tile is a length 16 array of palette line indexes
    ];

    @observable mappings = [
        // {art, top, left, priority, palette, hflip, vflip, width, height}
    ];

    @observable dplcs = [
        // {art, size}
    ];

    @computed get palettesRGB() {
        return this.palettes.map((palette) => (
            palette.map((color) => (
                color.slice(1).split``.map((d) => parseInt(`${d}${d}`, 16))
            ))
        ));
    }

    @computed get sprites() {
        return this.mappings.map((mappingList, index) => {
            let buffer = [];

            const dplcsAvailable = this.config.dplcsEnabled && this.dplcs.length > index;

            if (dplcsAvailable) {
                this.dplcs[index].forEach(({art, size}) => {
                    Array.from({length: size}, (_, i) => {
                        if (this.tiles.length <= art + i) {
                            buffer.push([]);
                        }
                        else {
                            buffer.push(this.tiles[art + i]);
                        }
                    });
                });
            }
            else {
                buffer = this.tiles;
            }

            return {
                index, buffer,
                mappings: mappingList,
                dplcs: dplcsAvailable && this.dplcs[index],
            };
        });
    }

    @computed get currentSprite() {
        return this.sprites[this.config.currentSprite]
            || this.sprites[0]
            || { mappings: [], buffer: [], index: 0, dplcs: [], };
    }

    @computed get activeTiles() {
        const { config: { dplcsEnabled }, currentSprite: { mappings, dplcs } } = environment;
        let activeTiles = [];

        const objs = (dplcsEnabled ? dplcs : mappings);

        if (!objs.length) return [];

        objs.forEach(({art, width, height, size}) => {
            activeTiles.push(...range(art, art + (size || width * height)));
        });

        return unique(activeTiles);
    }

    @action swapSprite = (oldIndex, newIndex) => {
        if (oldIndex != newIndex) {
            this.config.dplcsEnabled &&
            this.dplcs.replace(arrayMove(this.dplcs, oldIndex, newIndex));
            this.mappings.replace(arrayMove(this.mappings, oldIndex, newIndex));
        }
    };

    @action swapPalette = (oldIndex, newIndex) => {
        if (oldIndex != newIndex) {
            this.palettes.replace(arrayMove(this.palettes, oldIndex, newIndex));
        }
    };

    @action resetPalettes = () => {
        this.palettes.replace(defaultPalettes);
    };

    @action doAction = (callback) => { callback(this); };

}

const environment = new Environment();
storage(environment, 'environment');

autorun(() => {
    const { mappings, config } = environment;

    // force currentSprite to lie within bounds
    if (config.currentSprite < 0 || mappings.length == 0) {
        config.currentSprite = 0;
    } else if (config.currentSprite >= mappings.length) {
        config.currentSprite = mappings.length -1;
    }
});

initHistory();

export { environment };
