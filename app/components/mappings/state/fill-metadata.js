import { environment } from '~/store/environment';
import { mappingState } from './index';

// when every sprite carries the same metadata keys at a given piece (or DPLC
// entry) index, that is part of the format, so a new item at that index gets
// them too. keys every item has are filled at any index as a fallback.
// labels and freetext are per-item and left alone

const isLabel = (key) => /label/i.test(key);

const isNumeric = (value) =>
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)));

function sharedKeys(items) {
    return Object.keys(items[0].metadata || {})
        .filter((key) => !isLabel(key))
        .filter((key) => items.every(({ metadata }) =>
            metadata && key in metadata && isNumeric(metadata[key])))
        .map((key) => {
            const value = items[0].metadata[key];
            const allSame = items.every(({ metadata }) => metadata[key] === value);
            return { key, value, allSame };
        });
}

function keysByIndex(sprites) {
    const byIndex = [];
    sprites.forEach((sprite) => {
        sprite.forEach((item, i) => {
            (byIndex[i] = byIndex[i] || []).push(item);
        });
    });
    return byIndex.map(sharedKeys);
}

function allKeys(sprites) {
    const items = sprites.reduce((acc, sprite) => acc.concat(sprite.slice()), []);
    return items.length ? sharedKeys(items) : [];
}

// same index in the nearest previous sprite that has it, wrapping round
function previousAtIndex(sprites, spriteIndex, itemIndex, key) {
    const count = sprites.length;
    for (let n = 1; n < count; n++) {
        const sprite = sprites[(((spriteIndex - n) % count) + count) % count] || [];
        const metadata = sprite[itemIndex]?.metadata;
        if (metadata && key in metadata) return metadata[key];
    }
}

// nearest earlier item with the key: same sprite first, then previous sprites,
// wrapping round to the end
function previousItem(sprites, spriteIndex, itemIndex, key) {
    const count = sprites.length;
    for (let n = 0; n <= count; n++) {
        const sprite = sprites[(((spriteIndex - n) % count) + count) % count] || [];
        const start = n === 0 ? itemIndex - 1 : sprite.length - 1;
        for (let i = start; i >= 0; i--) {
            const { metadata } = sprite[i];
            if (metadata && key in metadata) return metadata[key];
        }
    }
}

function fillSprite(sprites, spriteIndex, byIndex, everywhere) {
    const sprite = sprites[spriteIndex];
    if (!sprite) return;
    const fill = (item, i, keys, previous) => {
        keys.forEach(({ key, value, allSame }) => {
            if (item.metadata && key in item.metadata) return;
            const guess = allSame ? value : previous(sprites, spriteIndex, i, key);
            if (guess === undefined) return;
            if (!item.metadata) item.metadata = {};
            item.metadata[key] = guess;
        });
    };
    sprite.forEach((item, i) => {
        fill(item, i, byIndex[i] || [], previousAtIndex);
        fill(item, i, everywhere, previousItem);
    });
}

// call before creating pieces/entries, then call the result with the sprite
// index afterwards: the keys have to be read while every sprite still has them
export function prepareMetadataFill() {
    if (!mappingState.autofillMetadata) return () => {};
    const { mappings, dplcs, config: { dplcsEnabled } } = environment;
    const pools = [[mappings, keysByIndex(mappings), allKeys(mappings)]];
    if (dplcsEnabled) pools.push([dplcs, keysByIndex(dplcs), allKeys(dplcs)]);

    return (spriteIndex) => {
        pools.forEach(([sprites, byIndex, everywhere]) =>
            fillSprite(sprites, spriteIndex, byIndex, everywhere));
    };
}
