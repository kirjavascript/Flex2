// pixel-space grid over the mappings: each cell lists the mappings overlapping
// it, so per-pixel lookups don't scan every mapping in the sprite
const CELL = 64;

export function createDrawingSurface(mappings, buffer) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    mappings.forEach(({top, left, width, height}) => {
        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, left + (width * 8));
        maxY = Math.max(maxY, top + (height * 8));
    });

    const cols = Math.max(1, Math.ceil((maxX - minX) / CELL));
    const rows = Math.max(1, Math.ceil((maxY - minY) / CELL));
    const grid = new Array(cols * rows);

    mappings.forEach((mapping) => {
        const {top, left, width, height} = mapping;
        const right = left + (width * 8);
        const bottom = top + (height * 8);
        for (let gy = Math.floor((top - minY) / CELL); gy <= Math.floor((bottom - 1 - minY) / CELL); gy++) {
            for (let gx = Math.floor((left - minX) / CELL); gx <= Math.floor((right - 1 - minX) / CELL); gx++) {
                const index = gx + (gy * cols);
                (grid[index] || (grid[index] = [])).push(mapping);
            }
        }
    });

    // buckets are filled in mappings order, so iteration order matches a plain
    // find() over mappings
    const bucketAt = (x, y) => {
        if (x < minX || x >= maxX || y < minY || y >= maxY) return undefined;
        return grid[Math.floor((x - minX) / CELL) + (Math.floor((y - minY) / CELL) * cols)];
    };

    const contains = ({top, left, width, height}, x, y) => {
        return x >= left
            && x < left + (width * 8)
            && y >= top
            && y < top + (height * 8);
    };

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

    const getPixel = (x, y) => {
        const bucket = bucketAt(x, y);
        const mapping = bucket && bucket.find((mapping) => contains(mapping, x, y));
        return mapping && getTilePixel(mapping, x, y);
    };

    const setPixel = (x, y, colorIndex) => {
        const bucket = bucketAt(x, y);
        if (!bucket) return;

        bucket.forEach((mapping) => {
            if (!contains(mapping, x, y)) return;
            const {top, left, width, height, art, vflip, hflip} = mapping;
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
    };

    const fill = (x, y, colorIndex) => {
        const target = getPixel(x, y);
        if (target === undefined || target === colorIndex) return;

        // int-indexed visited bitmap over the sprite bbox: no string keys, no
        // object pairs, no Set
        const width = maxX - minX;
        const height = maxY - minY;
        const visited = new Uint8Array(width * height);
        const pending = [x, y];

        while (pending.length) {
            const py = pending.pop();
            const px = pending.pop();
            const ix = px - minX;
            const iy = py - minY;
            if (ix < 0 || iy < 0 || ix >= width || iy >= height) continue;
            const index = ix + (iy * width);
            if (visited[index]) continue;
            visited[index] = 1;
            if (getPixel(px, py) !== target) continue;
            setPixel(px, py, colorIndex);
            pending.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
        }
    };

    // every tile the surface could write to, copied once per stroke so live
    // previews can be redrawn from a clean base on every frame
    let snapshot;

    const takeSnapshot = () => {
        const tiles = new Set();
        mappings.forEach(({art, width, height}) => {
            for (let i = 0; i < width * height; i++) {
                const tile = buffer[art + i];
                // Frozen tiles are shared bank-boundary placeholders.
                if (tile && !Object.isFrozen(tile)) tiles.add(tile);
            }
        });
        snapshot = Array.from(tiles, (tile) => ({tile, pixels: tile.slice()}));
    };

    const restore = () => {
        if (!snapshot) return;
        snapshot.forEach(({tile, pixels}) => {
            for (let i = 0; i < pixels.length; i++) {
                tile[i] = pixels[i];
            }
        });
    };

    return {
        getPixel,
        setPixel,
        fill,
        snapshot: takeSnapshot,
        restore,
    };
}
