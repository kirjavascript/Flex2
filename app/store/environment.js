import { observable, computed, action, autorun, makeObservable } from 'mobx';
import range from 'lodash/range';
import unique from 'lodash/uniq';
import { storage } from './storage';
import { initHistory } from './history';
import { defaultPalettes } from '~/formats/palette';
import arrayMove from 'array-move';

const emptyTile = Object.freeze(new Array(64).fill(0));

class Environment {
    config = {
        currentSprite: 0,
        currentTile: 0,
        currentBank: 0,
        transparency: true,
        dplcsEnabled: false,
        artPaletteLine: 0,
    };

    // palettes must use colours of the form #NNN
    palettes = defaultPalettes;

    // art is a list of banks: tiles at an address. a bank holds its own tiles,
    // so how far it reaches is simply how many it has. banks can be switched
    // off to see past one that overlaps another
    art = [
        // {address, tiles: [...], enabled}, in load order
    ];

    mappings = [
        // {art, top, left, priority, palette, hflip, vflip, width, height}
    ];

    dplcs = [
        // {art, size}
    ];

    spriteMetadata = [
        // per-sprite KV metadata
    ];

    constructor() {
        makeObservable(this, {
            config: observable,
            palettes: observable,
            art: observable,
            mappings: observable,
            dplcs: observable,
            spriteMetadata: observable,
            palettesRGB: computed,
            tiles: computed,
            enabledBanks: computed,
            bankOrder: computed,
            currentBank: computed,
            nextTile: computed,
            sprites: computed,
            currentSprite: computed,
            activeTiles: computed,
            setTile: action,
            appendTiles: action,
            toggleBank: action,
            replaceTiles: action,
            setArt: action,
            clearArt: action,
            swapSprite: action,
            swapPalette: action,
            resetPalettes: action,
            doAction: action
        });
    }

    get enabledBanks() {
        return this.art.filter(({ enabled }) => enabled !== false);
    }

    // the order banks claim a contested tile in: the bank being worked on
    // first, then the lowest one that covers it
    get bankOrder() {
        const current = this.currentBank;
        return current
            ? [current, ...this.enabledBanks.filter((bank) => bank !== current)]
            : this.enabledBanks;
    }

    // tile indices are absolute, so the banks are laid out flat for reading.
    // what is shown is what an edit would land in
    get tiles() {
        const flat = [];

        this.bankOrder.forEach(({ address, tiles }) => {
            tiles.forEach((tile, i) => {
                const at = address + i;
                // written to sparsely: an empty slot is one no bank has claimed,
                // which saves tracking ownership separately
                if (flat[at] === undefined) flat[at] = tile;
            });
        });

        // one shared tile stands in for every gap. it is frozen because it
        // belongs to no bank, so nothing may draw into it
        for (let i = 0; i < flat.length; i++) {
            if (flat[i] === undefined) flat[i] = emptyTile;
        }

        return flat;
    }

    // the bank tiles are added to, drawn into and rearranged in
    get currentBank() {
        const bank = this.art[this.config.currentBank];
        return bank && bank.enabled !== false ? bank : this.enabledBanks[0];
    }

    // the absolute index appendTiles will write its first tile at
    get nextTile() {
        const bank = this.currentBank;
        return bank ? bank.address + bank.tiles.length : 0;
    }

    // where two banks overlap, the active one owns the tile
    bankAt(index) {
        return this.bankOrder.find(({ address, tiles }) =>
            index >= address && index < address + tiles.length);
    }

    setTile = (index, tile) => {
        const bank = this.bankAt(index);
        if (bank) bank.tiles[index - bank.address] = tile;
    };

    appendTiles = (newTiles) => {
        const bank = this.currentBank;
        if (bank) bank.tiles.push(...newTiles);
        else this.art.push({ address: 0, tiles: newTiles, enabled: true });
    };

    toggleBank = (index) => {
        const bank = this.art[index];
        if (bank) bank.enabled = bank.enabled === false;
    };

    // tools that reorder or drop tiles work on the active bank
    replaceTiles = (newTiles) => {
        const index = this.art.indexOf(this.currentBank);
        if (index < 0) this.art.replace([{ address: 0, tiles: newTiles }]);
        else this.art[index] = { ...this.art[index], tiles: newTiles };
    };

    setArt = (banks) => {
        this.art.replace(banks);
        if (this.config.currentBank >= banks.length) this.config.currentBank = 0;
    };

    clearArt = () => {
        this.art.replace([]);
    };

    get palettesRGB() {
        return this.palettes.map((palette) => (
            palette.map((color) => (
                color.slice(1).split``.map((d) => parseInt(`${d}${d}`, 16))
            ))
        ));
    }

    get sprites() {
        const dplcsEnabled = this.config.dplcsEnabled;

        return this.mappings.map((mappingList, index) => {
            const dplcs = dplcsEnabled && this.dplcs.length > index
                ? this.dplcs[index]
                : null;

            const sprite = {
                index,
                mappings: mappingList,
                metadata: this.spriteMetadata[index] || {},
                ...(dplcs && { dplcs }),
            };

            // most sprites are off screen most of the time, so a buffer is only
            // gathered for the ones something actually reads
            Object.defineProperty(sprite, 'buffer', {
                enumerable: true,
                configurable: true,
                get: () => {
                    if (!dplcs) return this.tiles;

                    const tiles = this.tiles;
                    const buffer = [];
                    dplcs.forEach(({ art, size }) => {
                        for (let i = 0; i < size; i++) {
                            buffer.push(tiles.length <= art + i ? [] : tiles[art + i]);
                        }
                    });
                    return buffer;
                },
            });

            return sprite;
        });
    }

    get currentSprite() {
        return this.sprites[this.config.currentSprite]
            || this.sprites[0]
            || { mappings: [], buffer: [], index: 0, dplcs: [], metadata: {} };
    }

    get activeTiles() {
        const { config: { dplcsEnabled }, currentSprite: { mappings, dplcs } } = this;
        let activeTiles = [];

        const objs = (dplcsEnabled && dplcs ? dplcs : mappings);

        if (!objs.length) return [];

        objs.forEach(({art, width, height, size}) => {
            activeTiles.push(...range(art, art + (size || width * height)));
        });

        return unique(activeTiles);
    }

    swapSprite = (oldIndex, newIndex) => {
        if (oldIndex != newIndex) {
            this.config.dplcsEnabled &&
            this.dplcs.replace(arrayMove(this.dplcs, oldIndex, newIndex));
            this.mappings.replace(arrayMove(this.mappings, oldIndex, newIndex));
            this.spriteMetadata.replace(arrayMove(this.spriteMetadata, oldIndex, newIndex));
        }
    };

    swapPalette = (oldIndex, newIndex) => {
        if (oldIndex != newIndex) {
            this.palettes.replace(arrayMove(this.palettes, oldIndex, newIndex));
        }
    };

    resetPalettes = () => {
        this.palettes.replace(defaultPalettes);
    };

    doAction = (callback) => { callback(this); };
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
