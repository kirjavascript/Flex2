import min from 'lodash/min';
import cloneDeep from 'lodash/cloneDeep';

export function getActiveTiles(buffer, width, height, startX = 0, startY = 0) {

    let activeTiles = [];

    for (let x = startX; x < width-8; x+=8) {
        for (let y = startY; y < height-8; y+=8) {
            // tile
            for (let i = 0; i < 64; i++) {
                const pX = (i % 8) + x;
                const pY = ((i / 8)|0) + y;
                const pos = ((pY * width) + pX) * 4;

                if (buffer.data[pos+3] !== 0) {
                    activeTiles.push({ x, y });
                    break;
                }
            }
        }
    }

    return activeTiles;
}

export function getOffsetLists(canvas, ctx) {
    const { width, height } = canvas;
    const buffer = ctx.getImageData(0, 0, width, height);

    let offsetList = [];

    // check every possible position the grid can be placed at
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            offsetList.push(getActiveTiles(buffer, width, height, x, y));
        }
    }

    return offsetList;

}

export function getBestOffsets(canvas, ctx) {
    return min(getOffsetLists(canvas, ctx));
}

// expand as a square
function checkSquare(tile, offsets) {
    for (let vh = 1; vh < 4; vh++)  {
        for (let h = 0; h <= vh; h++) {
            for (let w = 0; w <= vh; w++) { // three shameful for loops
                if (
                    (w != 0 || h != 0) &&
                    !offsets.find(({x, y}) => (
                        x == tile.x + (8*w) && y == tile.y + (8*h))
                    )
                ) {
                    return vh-1;
                }
            }
        }
    }
    return 3;
}

// expand horizontally
function checkH(tile, offsets, height = 0, startV = 0) {
    for (let w = startV; w < 4; w++) {
        for (let h = 0; h <= height; h++) {
            if (
                (w != 0 || h != 0) &&
                !offsets.find(({x, y}) => (
                    x == tile.x + (8*w) && y == tile.y + (8*h))
                )
            ) {
                return w-1;
            }
        }
    }
    return 3;
}

// expand vertically
function checkV(tile, offsets, width = 0, startH = 0) {
    for (let h = startH; h < 4; h++) {
        for (let w = 0; w <= width; w++) {
            if (
                (w != 0 || h != 0) &&
                !offsets.find(({x, y}) => (
                    x == tile.x + (8*w) && y == tile.y + (8*h))
                )
            ) {
                return h-1;
            }
        }
    }
    return 3;
}

function removeOffsets(tile, width, height, offsets) {
    return offsets.filter(({x, y}) => {
        for (let w = 0; w <= width; w++) {
            for (let h = 0; h <= height; h++) {
                if (
                    tile.x + (w*8) == x &&
                    tile.y + (h*8) == y
                ) {
                    return false;
                }
            }
        }
        return true;
    });
}

// various mapping algorithms

export function greedySquare(baseOffsets, accessor) {
    let offsets = cloneDeep(baseOffsets);

    let mappings = [];

    while (offsets.length) {
        const tile = accessor(offsets);
        let width, height;

        const sq = checkSquare(tile, offsets);
        if (sq < 3) {
            const w = checkH(tile, offsets, sq, sq);
            const h = checkV(tile, offsets, sq, sq);
            if (w >= h) {
                width = w;
                height = sq;
            }
            else {
                width = sq;
                height = h;
            }
        }
        else {
            width = 3;
            height = 3;
        }

        offsets = removeOffsets(tile, width, height, offsets);
        mappings.push({
            ...tile,
            width: width + 1,
            height: height + 1,
        });
    }

    return mappings;
}

export function greedyH(baseOffsets, accessor) {
    let offsets = cloneDeep(baseOffsets);

    let mappings = [];

    while (offsets.length) {
        const tile = accessor(offsets);

        const width = checkH(tile, offsets);
        const height = checkV(tile, offsets, width);

        offsets = removeOffsets(tile, width, height, offsets);
        mappings.push({
            ...tile,
            width: width + 1,
            height: height + 1,
        });
    }

    return mappings;

}

// skip checking greedyV because it will result in more mappings placed in horizontal lines

// these accessors rely on the offset order
function firstIndexAccessor(offsets) {
    return offsets.shift();
}
function topmostLeftAccessor(offsets) {
    const topmostLeftTile = offsets.reduce((a, c) => {
        if (c.y < a.y) {
            return c;
        }
        else {
            return a;
        }
    }, offsets[0]);

    const removalIndex = offsets.findIndex((d) => d === topmostLeftTile);
    offsets.splice(removalIndex, 1);
    return topmostLeftTile;
}

export function getMappingsFromOffsets(offsets) {
    return min([
        greedySquare(offsets, firstIndexAccessor),
        greedySquare(offsets, topmostLeftAccessor),
        greedyH(offsets, firstIndexAccessor),
        greedyH(offsets, topmostLeftAccessor),
    ]);
}

export function getMappings(canvas, ctx, type) {
    const offsetLists = getOffsetLists(canvas, ctx);

    const offsetsAndMappings = offsetLists.map((offsets) => ({
        offsets,
        mappings: getMappingsFromOffsets(offsets),
    }));

    if (type == 'tiles') {
        // pick smallest mappings from smallest tile group

        const fewestTilesQty = offsetsAndMappings.reduce((a, c) => (
            c.offsets.length < a ? c.offsets.length : a
        ), Infinity);

        const fewestTilesList = offsetsAndMappings.filter(({offsets}) => (
            offsets.length == fewestTilesQty
        ));

        return fewestTilesList.slice(1).reduce((a, c) => {
            if (c.mappings.length < a.mappings.length) {
                return c;
            }
            else {
                return a;
            }
        }, fewestTilesList[0]).mappings;

    }
    else if (type == 'mappings') {
        // pick smallest tiles from smallest mappings group

        const fewestMappingsQty = offsetsAndMappings.reduce((a, c) => (
            c.mappings.length < a ? c.mappings.length : a
        ), Infinity);

        const fewestMappingsList = offsetsAndMappings.filter(({mappings}) => (
            mappings.length == fewestMappingsQty
        ));

        return fewestMappingsList.slice(1).reduce((a, c) => {
            if (c.offsets.length < a.offsets.length) {
                return c;
            }
            else {
                return a;
            }
        }, fewestMappingsList[0]).mappings;
    }
}
