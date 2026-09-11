export function createDrawingSurface(mappings, buffer) {
    const mappingAt = (x, y) => mappings.find(({top, left, width, height}) => {
        return x >= left
            && x < left + (width * 8)
            && y >= top
            && y < top + (height * 8);
    });

    const getTilePixel = (mapping, x, y) => {
        const realAbsX = x - mapping.left;
        const realAbsY = y - mapping.top;
        const absX = mapping.hflip ? (mapping.width * 8) - realAbsX - 1 : realAbsX;
        const absY = mapping.vflip ? (mapping.height * 8) - realAbsY - 1 : realAbsY;
        const mapX = (absX / 8)|0;
        const mapY = (absY / 8)|0;
        const tile = buffer[mapping.art + (mapX * mapping.height) + mapY];

        return tile && tile[(absX % 8) + ((absY % 8) * 8)];
    };

    // every tile the surface could write to, copied once per stroke so live
    // previews can be redrawn from a clean base on every frame
    let snapshot;

    return {
        getPixel(x, y) {
            const mapping = mappingAt(x, y);
            return mapping && getTilePixel(mapping, x, y);
        },

        setPixel(x, y, colorIndex) {
            mappings.forEach((mapping) => {
                const {top, left, width, height, art, vflip, hflip} = mapping;
                if (x < left || x >= left + (width * 8) || y < top || y >= top + (height * 8)) {
                    return;
                }

                const realAbsX = x - left;
                const realAbsY = y - top;
                const absX = hflip ? (width * 8) - realAbsX - 1 : realAbsX;
                const absY = vflip ? (height * 8) - realAbsY - 1 : realAbsY;
                const mapX = (absX / 8)|0;
                const mapY = (absY / 8)|0;
                const tile = buffer[art + (mapX * height) + mapY];

                // Frozen tiles are shared bank-boundary placeholders.
                if (tile && !Object.isFrozen(tile)) {
                    tile[(absX % 8) + ((absY % 8) * 8)] = colorIndex;
                }
            });
        },

        snapshot() {
            const tiles = new Set();
            mappings.forEach(({art, width, height}) => {
                for (let i = 0; i < width * height; i++) {
                    const tile = buffer[art + i];
                    // Frozen tiles are shared bank-boundary placeholders.
                    if (tile && !Object.isFrozen(tile)) tiles.add(tile);
                }
            });
            snapshot = Array.from(tiles, (tile) => ({ tile, pixels: tile.slice() }));
        },

        restore() {
            if (!snapshot) return;
            snapshot.forEach(({tile, pixels}) => {
                for (let i = 0; i < pixels.length; i++) {
                    tile[i] = pixels[i];
                }
            });
        },
    };
}
