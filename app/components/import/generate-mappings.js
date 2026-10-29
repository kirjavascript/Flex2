// pixels at or below this alpha are transparent, matching sprite detection
export const ALPHA_CUTOFF = 0x80;

const MAX_PIECE = 4; // tiles per side
const EXACT_MAX_CELLS = 64;
const EXACT_NODE_BUDGET = 20000;
const EXACT_OFFSETS = 4;
const EXACT_FREE_MAX_PIECES = 8;
const EXACT_FREE_BUDGET = 2000;
const MIN_TEMPLATE_PIXELS = 16;
const MIN_SEED_GAIN = 32;
const ALIGNED_OFFSETS = 2;

const tileCount = (mappings) => mappings.reduce((a, c) => a + c.width * c.height, 0);

// lower is better: [primary, secondary]
function score(mappings, type) {
    const pieces = mappings.length;
    const tiles = tileCount(mappings);
    return type == 'tiles' ? [tiles, pieces] : [pieces, tiles];
}

function pickBest(candidates, type) {
    let best, bestScore;
    candidates.forEach((mappings) => {
        const s = score(mappings, type);
        if (!best || s[0] < bestScore[0] || (s[0] == bestScore[0] && s[1] < bestScore[1])) {
            best = mappings;
            bestScore = s;
        }
    });
    return best;
}

// grid placement: every piece sits on one shared 8px grid

// cells are tile positions on the grid as [col, row]
function getActiveCells(mask, width, height, ox, oy) {
    const cells = [];
    for (let x = ox, col = 0; x < width; x += 8, col++) {
        for (let y = oy, row = 0; y < height; y += 8, row++) {
            tile: for (let pY = y; pY < y + 8 && pY < height; pY++) {
                for (let pX = x; pX < x + 8 && pX < width; pX++) {
                    if (mask[pY * width + pX]) {
                        cells.push([col, row]);
                        break tile;
                    }
                }
            }
        }
    }
    return cells;
}

// the cells still to be covered, as a flat grid
class Cells {
    constructor(cells) {
        this.cols = cells.reduce((a, [c]) => Math.max(a, c), 0) + 1;
        this.rows = cells.reduce((a, [, r]) => Math.max(a, r), 0) + 1;
        this.grid = new Uint8Array(this.cols * this.rows);
        this.size = 0;
        cells.forEach(([c, r]) => this.add(c, r));
    }
    has(c, r) {
        return c < this.cols && r < this.rows && this.grid[r * this.cols + c] === 1;
    }
    add(c, r) {
        if (!this.grid[r * this.cols + c]) this.size++;
        this.grid[r * this.cols + c] = 1;
    }
    delete(c, r) {
        if (this.grid[r * this.cols + c]) this.size--;
        this.grid[r * this.cols + c] = 0;
    }
}

// fits checks a whole rectangle against the remaining cells
function fits(remaining, col, row, w, h) {
    if (col + w > remaining.cols || row + h > remaining.rows) return false;
    const { grid, cols } = remaining;
    for (let r = row; r < row + h; r++) {
        for (let c = col, i = r * cols + col; c < col + w; c++, i++) {
            if (grid[i] !== 1) return false;
        }
    }
    return true;
}

function take(remaining, col, row, w, h) {
    for (let c = col; c < col + w; c++) {
        for (let r = row; r < row + h; r++) {
            remaining.delete(c, r);
        }
    }
}

// expand as a square, then along whichever axis goes further
function expandSquare(remaining, col, row) {
    let sq = 1;
    while (sq < MAX_PIECE && fits(remaining, col, row, sq + 1, sq + 1)) sq++;
    let w = sq, h = sq;
    while (w < MAX_PIECE && fits(remaining, col, row, w + 1, sq)) w++;
    while (h < MAX_PIECE && fits(remaining, col, row, sq, h + 1)) h++;
    return w >= h ? [w, sq] : [sq, h];
}

// expand horizontally, then vertically
function expandH(remaining, col, row) {
    let w = 1, h = 1;
    while (w < MAX_PIECE && fits(remaining, col, row, w + 1, 1)) w++;
    while (h < MAX_PIECE && fits(remaining, col, row, w, h + 1)) h++;
    return [w, h];
}

// greedy fill from tiles in a fixed visiting order
function greedy(cells, order, expand) {
    const remaining = new Cells(cells);
    const sorted = [...cells].sort(order);
    const pieces = [];
    sorted.forEach(([col, row]) => {
        if (!remaining.has(col, row)) return;
        const [w, h] = expand(remaining, col, row);
        take(remaining, col, row, w, h);
        pieces.push({ col, row, w, h });
    });
    return pieces;
}

// repeatedly place the biggest rectangle that fits anywhere
function largestFirst(cells) {
    const remaining = new Cells(cells);
    const sorted = [...cells].sort(rowMajor);
    const pieces = [];
    while (remaining.size) {
        let best;
        sorted.forEach(([col, row]) => {
            if (!remaining.has(col, row)) return;
            for (let w = MAX_PIECE; w > 0; w--) {
                for (let h = MAX_PIECE; h > 0; h--) {
                    if ((!best || w * h > best.w * best.h) && fits(remaining, col, row, w, h)) {
                        best = { col, row, w, h };
                    }
                }
            }
        });
        take(remaining, best.col, best.row, best.w, best.h);
        pieces.push(best);
    }
    return pieces;
}

// the first uncovered cell in row-major order can only be covered by a piece
// whose top left corner it is, so that is the only cell worth branching on
function exact(cells, upperBound) {
    if (cells.length > EXACT_MAX_CELLS) return;
    const sorted = [...cells].sort(rowMajor);
    const remaining = new Cells(sorted);
    let best = upperBound;
    let bestPieces;
    let nodes = 0;
    const stack = [];

    const search = (index) => {
        if (++nodes > EXACT_NODE_BUDGET) return;
        while (index < sorted.length && !remaining.has(...sorted[index])) index++;
        if (index == sorted.length) {
            if (stack.length < best) {
                best = stack.length;
                bestPieces = [...stack];
            }
            return;
        }
        if (stack.length + Math.ceil(remaining.size / (MAX_PIECE * MAX_PIECE)) >= best) return;
        const [col, row] = sorted[index];
        for (let w = MAX_PIECE; w > 0; w--) {
            for (let h = MAX_PIECE; h > 0; h--) {
                if (!fits(remaining, col, row, w, h)) continue;
                take(remaining, col, row, w, h);
                stack.push({ col, row, w, h });
                search(index + 1);
                stack.pop();
                for (let c = col; c < col + w; c++) {
                    for (let r = row; r < row + h; r++) remaining.add(c, r);
                }
            }
        }
    };
    search(0);
    return bestPieces;
}

const columnMajor = (a, b) => a[0] - b[0] || a[1] - b[1];
const rowMajor = (a, b) => a[1] - b[1] || a[0] - b[0];

// mirroring the cells lets the right/down expanding strategies grow left/up
function mirrorCells(cells, flipH, flipV) {
    const maxCol = Math.max(...cells.map(([c]) => c));
    const maxRow = Math.max(...cells.map(([, r]) => r));
    const mirrored = cells.map(([c, r]) => [flipH ? maxCol - c : c, flipV ? maxRow - r : r]);
    const unmirror = (pieces) => pieces.map(({ col, row, w, h }) => ({
        col: flipH ? maxCol - col - w + 1 : col,
        row: flipV ? maxRow - row - h + 1 : row,
        w,
        h,
    }));
    return [mirrored, unmirror];
}

function gridCandidates(cells) {
    const results = [largestFirst(cells)];
    [[false, false], [true, false], [false, true], [true, true]].forEach(([flipH, flipV]) => {
        const [mirrored, unmirror] = mirrorCells(cells, flipH, flipV);
        [columnMajor, rowMajor].forEach((order) => {
            [expandSquare, expandH].forEach((expand) => {
                results.push(unmirror(greedy(mirrored, order, expand)));
            });
        });
    });
    return results;
}

// the grid strategies don't care where a layout of cells sits, and the same
// layout comes up at many offsets and bands, so results are kept per layout,
// moved to the origin
const layouts = new Map();
const LAYOUT_LIMIT = 50000;

function byLayout(kind, cells, compute) {
    let minC = Infinity, minR = Infinity;
    cells.forEach(([c, r]) => {
        if (c < minC) minC = c;
        if (r < minR) minR = r;
    });
    // one character per cell; layouts are far smaller than 256 cells a side
    const key = kind + String.fromCharCode.apply(null, cells.map(([c, r]) => ((c - minC) << 8) | (r - minR)));
    let result = layouts.get(key);
    if (result === undefined) {
        result = compute(cells.map(([c, r]) => [c - minC, r - minR])) || null;
        if (layouts.size > LAYOUT_LIMIT) layouts.clear();
        layouts.set(key, result);
    }
    return result && result.map((piece) => ({ ...piece, col: piece.col + minC, row: piece.row + minR }));
}

function gridMappings(mask, width, height, type) {
    const offsets = [];
    for (let ox = 0; ox < 8; ox++) {
        for (let oy = 0; oy < 8; oy++) {
            const cells = getActiveCells(mask, width, height, ox, oy);
            if (cells.length) offsets.push({ ox, oy, cells });
        }
    }
    if (!offsets.length) return [];

    // tiles are fixed per offset on the grid, so in tiles mode only the
    // offsets with the fewest of them can win
    const fewest = Math.min(...offsets.map(({ cells }) => cells.length));
    const considered = type == 'tiles'
        ? offsets.filter(({ cells }) => cells.length == fewest)
        : offsets;

    const toMappings = ({ ox, oy }, pieces) => pieces.map(({ col, row, w, h }) => ({
        x: ox + col * 8,
        y: oy + row * 8,
        width: w,
        height: h,
    }));

    const greedyResults = considered.map((offset) => ({
        offset,
        pieces: byLayout('grid', offset.cells, (cells) => pickBest(gridCandidates(cells), 'mappings')),
    }));

    // the exact search is costly, so it only runs where greedy came closest
    const ranked = greedyResults
        .map((result) => ({ result, score: score(toMappings(result.offset, result.pieces), type) }))
        .sort((a, b) => a.score[0] - b.score[0] || a.score[1] - b.score[1])
        .slice(0, EXACT_OFFSETS);
    ranked.forEach(({ result }) => {
        // greedy's count is the bound, and it is the same for the same layout
        const bound = result.pieces.length;
        result.pieces = byLayout(`exact${bound}`, result.offset.cells, (cells) => exact(cells, bound))
            || result.pieces;
    });

    return pickBest(greedyResults.map(({ offset, pieces }) => toMappings(offset, pieces)), type);
}

// free placement: each piece can sit at any pixel

function summedArea(uncovered, width, height) {
    const stride = width + 1;
    const sat = new Int32Array(stride * (height + 1));
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        for (let x = 0; x < width; x++) {
            rowSum += uncovered[y * width + x];
            sat[(y + 1) * stride + x + 1] = sat[y * stride + x + 1] + rowSum;
        }
    }
    return (x, y, w, h) => {
        const x0 = Math.max(0, x), y0 = Math.max(0, y);
        const x1 = Math.min(width, x + w), y1 = Math.min(height, y + h);
        if (x1 <= x0 || y1 <= y0) return 0;
        return sat[y1 * stride + x1] - sat[y0 * stride + x1]
            - sat[y1 * stride + x0] + sat[y0 * stride + x0];
    };
}

function bounds(mask, width, height) {
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (mask[y * width + x]) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    return maxX < 0 ? undefined : { minX, minY, maxX, maxY };
}

function freeMappings(mask, width, height, type) {
    const box = bounds(mask, width, height);
    if (!box) return [];

    // summed area table padded by a piece on every side, so any position a
    // piece can take reads straight from it
    const pad = MAX_PIECE * 8;
    const pw = width + pad * 2, ph = height + pad * 2, stride = pw + 1;
    const sat = new Int32Array(stride * (ph + 1));

    const uncovered = Uint8Array.from(mask);
    let left = uncovered.reduce((a, c) => a + c, 0);
    const pieces = [];

    while (left > 0) {
        sat.fill(0);
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            const row = (y + pad + 1) * stride;
            for (let x = 0; x < width; x++) {
                rowSum += uncovered[y * width + x];
                sat[row + x + pad + 1] = sat[row - stride + x + pad + 1] + rowSum;
            }
            for (let x = width; x < width + pad; x++) {
                sat[row + x + pad + 1] = sat[row - stride + x + pad + 1] + rowSum;
            }
        }
        for (let y = height + pad + 1; y <= ph; y++) {
            sat.copyWithin(y * stride, (y - 1) * stride, y * stride);
        }

        let best, bestHits = 0, bestTiles = 1;
        for (let w = 1; w <= MAX_PIECE; w++) {
            for (let h = 1; h <= MAX_PIECE; h++) {
                const tiles = w * h, pxW = w * 8, pxH = h * 8;
                for (let y = box.minY - pxH + 1; y <= box.maxY; y++) {
                    const top = (y + pad) * stride, bottom = (y + pad + pxH) * stride;
                    for (let x = box.minX - pxW + 1; x <= box.maxX; x++) {
                        const l = x + pad, r = l + pxW;
                        const hits = sat[bottom + r] - sat[top + r] - sat[bottom + l] + sat[top + l];
                        if (!hits) continue;
                        // compare hits/tiles without dividing
                        const better = type == 'tiles'
                            ? hits * bestTiles > bestHits * tiles
                                || (hits * bestTiles == bestHits * tiles && hits > bestHits)
                            : hits > bestHits || (hits == bestHits && tiles < bestTiles);
                        if (better) {
                            best = { x, y, w, h };
                            bestHits = hits;
                            bestTiles = tiles;
                        }
                    }
                }
            }
        }

        const { x, y, w, h } = best;
        for (let pY = Math.max(0, y); pY < Math.min(height, y + h * 8); pY++) {
            for (let pX = Math.max(0, x); pX < Math.min(width, x + w * 8); pX++) {
                const i = pY * width + pX;
                left -= uncovered[i];
                uncovered[i] = 0;
            }
        }
        pieces.push({ x, y, width: w, height: h });
    }

    return pieces;
}

// exact search for the fewest pieces with free placement. for that only 4x4
// pieces are needed, refine shrinks them after. the first uncovered pixel
// in row-major order goes on the piece's top row, and a piece whose left column
// has nothing uncovered is beaten by the same piece one pixel right
function exactFree(mask, width, height, upperBound) {
    const opaque = [];
    for (let i = 0; i < mask.length; i++) if (mask[i]) opaque.push(i);
    const covered = new Uint8Array(mask.length);
    const size = MAX_PIECE * 8;
    let best = upperBound;
    let bestPieces;
    let nodes = 0;
    const stack = [];

    const search = (start) => {
        if (++nodes > EXACT_FREE_BUDGET) return;
        let k = start;
        while (k < opaque.length && covered[opaque[k]]) k++;
        if (k == opaque.length) {
            if (stack.length < best) {
                best = stack.length;
                bestPieces = [...stack];
            }
            return;
        }

        // pixels too far apart for one piece to cover two of them
        const far = [];
        for (let m = k; m < opaque.length && stack.length + far.length < best; m++) {
            const i = opaque[m];
            if (covered[i]) continue;
            const x = i % width, y = (i / width) | 0;
            if (far.every(([fx, fy]) => Math.abs(fx - x) >= size || Math.abs(fy - y) >= size)) {
                far.push([x, y]);
            }
        }
        if (stack.length + far.length >= best) return;

        const px = opaque[k] % width, py = (opaque[k] / width) | 0;
        const yEnd = Math.min(height, py + size);
        const candidates = [];
        for (let x = Math.max(0, px - size + 1); x <= px; x++) {
            let column = false;
            for (let y = py; y < yEnd && !column; y++) {
                const i = y * width + x;
                column = mask[i] && !covered[i];
            }
            if (!column) continue;
            const newly = [];
            for (let y = py; y < yEnd; y++) {
                for (let cx = x; cx < Math.min(width, x + size); cx++) {
                    const i = y * width + cx;
                    if (mask[i] && !covered[i]) newly.push(i);
                }
            }
            candidates.push({ x, newly });
        }
        candidates.sort((a, b) => b.newly.length - a.newly.length);

        for (const { x, newly } of candidates) {
            newly.forEach((i) => { covered[i] = 1; });
            stack.push({ x, y: py, width: MAX_PIECE, height: MAX_PIECE });
            search(k + 1);
            stack.pop();
            newly.forEach((i) => { covered[i] = 0; });
            if (nodes > EXACT_FREE_BUDGET) return;
        }
    };
    search(0);
    return bestPieces;
}

// grid per band: each band of up to four tile rows picks its own x offset
function bandMappings(mask, width, height, type) {
    let best;
    // a band's cells are those of the whole grid at that offset, in its rows
    const grids = new Map();
    const bandCells = (ox, oy, r, k) => {
        const at = ox * 8 + oy;
        if (!grids.has(at)) grids.set(at, getActiveCells(mask, width, height, ox, oy));
        const cells = [];
        grids.get(at).forEach(([c, row]) => {
            if (row >= r && row < r + k) cells.push([c, row - r]);
        });
        return cells;
    };
    for (let oy = 0; oy < 8; oy++) {
        const rows = Math.ceil((height - oy) / 8);
        const dp = [{ score: [0, 0], pieces: [] }];
        for (let r = 0; r < rows; r++) {
            if (!dp[r]) continue;
            for (let k = 1; k <= MAX_PIECE && r + k <= rows; k++) {
                const y0 = oy + r * 8;
                let band;
                for (let ox = 0; ox < 8; ox++) {
                    const cells = bandCells(ox, oy, r, k);
                    const pieces = cells.length ? byLayout(`band-${type}`, cells, (layout) => pickBest([
                        largestFirst(layout),
                        greedy(layout, rowMajor, expandH),
                        greedy(layout, rowMajor, expandSquare),
                    ], type)) : [];
                    const mapped = pieces.map(({ col, row, w, h }) => ({
                        x: ox + col * 8, y: y0 + row * 8, width: w, height: h,
                    }));
                    if (!band || better(score(mapped, type), band.score)) {
                        band = { score: score(mapped, type), pieces: mapped };
                    }
                    if (!cells.length) break;
                }
                const total = [dp[r].score[0] + band.score[0], dp[r].score[1] + band.score[1]];
                if (!dp[r + k] || better(total, dp[r + k].score)) {
                    dp[r + k] = { score: total, pieces: [...dp[r].pieces, ...band.pieces] };
                }
            }
        }
        if (dp[rows] && (!best || better(dp[rows].score, best.score))) best = dp[rows];
    }
    return best ? best.pieces : [];
}

// run a mask-based strategy on the transposed sprite: bands become columns
function transposed(strategy, mask, width, height, type) {
    const flipped = new Uint8Array(mask.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) flipped[x * height + y] = mask[y * width + x];
    }
    return strategy(flipped, height, width, type).map(({ x, y, width: w, height: h }) => ({
        x: y, y: x, width: h, height: w,
    }));
}

const better = (a, b) => a[0] < b[0] || (a[0] == b[0] && a[1] < b[1]);

// what the importer works with: which pixels are opaque, and a small number
// per distinct colour so tiles can be compared
function prepare({ data, width, height }) {
    const mask = new Uint8Array(width * height);
    const color = new Uint16Array(width * height);
    const colorMap = new Map();
    for (let i = 0; i < mask.length; i++) {
        const j = i * 4;
        if (data[j + 3] <= ALPHA_CUTOFF) continue;
        const rgb = (data[j] << 16) | (data[j + 1] << 8) | data[j + 2];
        if (!colorMap.has(rgb)) colorMap.set(rgb, colorMap.size + 1);
        mask[i] = 1;
        color[i] = colorMap.get(rgb);
    }
    return { width, height, mask, color, colorMap };
}

// frame pixels a piece draws: its template's, or every opaque one under it
function eachCovered(piece, width, height, mask, fn) {
    if (piece.cover) {
        piece.cover.forEach(fn);
        return;
    }
    const { x, y, width: w, height: h } = piece;
    for (let pY = Math.max(0, y); pY < Math.min(height, y + h * 8); pY++) {
        for (let pX = Math.max(0, x); pX < Math.min(width, x + w * 8); pX++) {
            const i = pY * width + pX;
            if (mask[i]) fn(i);
        }
    }
}

// shrink each piece to the tightest box around the pixels only it covers, and
// merge pairs of pieces whose pixels fit in one. the first `fixed` pieces
// are left alone
// whether two pieces share any pixel
export function piecesOverlap(a, b) {
    return a.x < b.x + b.width * 8 && b.x < a.x + a.width * 8
        && a.y < b.y + b.height * 8 && b.y < a.y + a.height * 8;
}

const hasOverlap = (pieces) => pieces.some((a, i) => pieces.some((b, j) => j > i && piecesOverlap(a, b)));

// with the sprite's overlap off, pieces are only moved or merged to where
// they don't overlap any other
function refine(input, sprite, type, fixed = 0) {
    const { mask, width, height, overlap = true } = sprite;
    const pieces = input.map((piece) => ({ ...piece }));
    const coverage = new Uint8Array(mask.length);
    const add = (piece, delta) => eachCovered(piece, width, height, mask, (i) => { coverage[i] += delta; });
    pieces.forEach((piece) => add(piece, 1));
    const opaqueIn = summedArea(mask, width, height);

    // box around what would be left uncovered without these pieces
    const needed = (list) => {
        list.forEach((piece) => add(piece, -1));
        let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
        list.forEach((piece) => eachCovered(piece, width, height, mask, (i) => {
            if (coverage[i]) return;
            const x = i % width, y = (i / width) | 0;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }));
        list.forEach((piece) => add(piece, 1));
        return maxX < 0 ? undefined : { minX, minY, maxX, maxY };
    };

    // fewest tiles around a box; any slack goes where it overlaps the most,
    // so other pieces have more room to shrink
    // others: the pieces it must stay clear of when overlap is off
    const tight = ({ minX, minY, maxX, maxY }, others) => {
        const w = Math.ceil((maxX - minX + 1) / 8);
        const h = Math.ceil((maxY - minY + 1) / 8);
        if (w > MAX_PIECE || h > MAX_PIECE) return;
        let best;
        for (let x = maxX - w * 8 + 1; x <= minX; x++) {
            for (let y = maxY - h * 8 + 1; y <= minY; y++) {
                const at = { x, y, width: w, height: h };
                if (!overlap && others.some((other) => piecesOverlap(at, other))) continue;
                const opaque = opaqueIn(x, y, w * 8, h * 8);
                if (!best || opaque > best.overlap) best = { x, y, width: w, height: h, overlap: opaque };
            }
        }
        return best;
    };

    for (let pass = 0, changed = true; changed && pass < 6; pass++) {
        changed = false;

        for (let i = fixed; i < pieces.length; i++) {
            const piece = pieces[i];
            const box = needed([piece]);
            if (!box) {
                add(piece, -1);
                pieces.splice(i--, 1);
                changed = true;
                continue;
            }
            const fit = tight(box, pieces.filter((other) => other !== piece));
            const tiles = piece.width * piece.height;
            if (fit && (fit.width * fit.height < tiles
                || (fit.width * fit.height == tiles && fit.overlap > opaqueIn(piece.x, piece.y, piece.width * 8, piece.height * 8)))) {
                add(piece, -1);
                Object.assign(piece, { x: fit.x, y: fit.y, width: fit.width, height: fit.height });
                add(piece, 1);
                changed = true;
            }
        }

        merging: for (let i = fixed; i < pieces.length; i++) {
            for (let j = i + 1; j < pieces.length; j++) {
                const a = pieces[i], b = pieces[j];
                const box = needed([a, b]);
                if (!box) continue;
                const fit = tight(box, pieces.filter((other) => other !== a && other !== b));
                if (!fit) continue;
                if (type == 'tiles' && fit.width * fit.height > a.width * a.height + b.width * b.height) continue;
                add(a, -1);
                add(b, -1);
                Object.assign(a, { x: fit.x, y: fit.y, width: fit.width, height: fit.height });
                add(a, 1);
                pieces.splice(j, 1);
                changed = true;
                break merging;
            }
        }
    }

    return pieces;
}

// a piece's pixels as a string, as drawn with the given flips
function pieceKey({ color, width, height }, { x, y, width: w, height: h }, hflip, vflip) {
    const W = w * 8, H = h * 8;
    const out = new Uint16Array(W * H);
    for (let yy = 0; yy < H; yy++) {
        const py = y + (vflip ? H - 1 - yy : yy);
        for (let xx = 0; xx < W; xx++) {
            const px = x + (hflip ? W - 1 - xx : xx);
            if (px >= 0 && py >= 0 && px < width && py < height) out[yy * W + xx] = color[py * width + px];
        }
    }
    return `${w},${h}:${String.fromCharCode.apply(null, out)}`;
}

// tiles a frame adds when a piece the same as an earlier one (flipped or not)
// reuses its tiles, and template pieces reuse existing art
function frameCost(sprite, pieces) {
    const seen = new Set();
    let tiles = 0;
    pieces.forEach((piece) => {
        if (piece.template) return;
        const variants = [[false, false], [true, false], [false, true], [true, true]]
            .map(([hflip, vflip]) => pieceKey(sprite, piece, hflip, vflip));
        if (variants.some((k) => seen.has(k))) return;
        seen.add(variants[0]);
        tiles += piece.width * piece.height;
    });
    return tiles;
}

function axisOf(sprite, horizontal) {
    const { mask, color, width, height } = sprite;
    const box = bounds(mask, width, height);
    if (!box) return;
    const sum = horizontal ? box.minX + box.maxX : box.minY + box.maxY;
    for (let y = box.minY; y <= box.maxY; y++) {
        for (let x = box.minX; x <= box.maxX; x++) {
            const mx = horizontal ? sum - x : x;
            const my = horizontal ? y : sum - y;
            if (color[y * width + x] != color[my * width + mx]) return;
        }
    }
    return sum;
}

// cover half of a symmetric sprite and mirror it; the copies cost no tiles
function symmetricCandidates(sprite, type, strategies) {
    const results = [];
    [true, false].forEach((horizontal) => {
        const sum = axisOf(sprite, horizontal);
        if (sum === undefined) return;
        const { width, height } = sprite;
        const mask = Uint8Array.from(sprite.mask);
        for (let i = 0; i < mask.length; i++) {
            const pos = horizontal ? i % width : (i / width) | 0;
            if (pos * 2 > sum) mask[i] = 0;
        }
        const half = { ...sprite, mask };
        strategies(half).forEach((pieces) => {
            const refined = refine(pieces, half, type);
            const mirrored = refined.map((piece) => (horizontal
                ? { ...piece, x: sum + 1 - piece.x - piece.width * 8 }
                : { ...piece, y: sum + 1 - piece.y - piece.height * 8 }));
            results.push(refine([...refined, ...mirrored], sprite, type, refined.length * 2));
        });
    });
    return results;
}

// a template's opaque pixels as [x, y, colour] runs for each flip, worked out
// once: templates last the whole import
const shapes = new WeakMap();
function templateShape(template) {
    let shape = shapes.get(template);
    if (shape) return shape;
    const W = template.width * 8, H = template.height * 8;
    const colours = [];
    const opaque = [];
    for (let i = 0; i < W * H; i++) {
        const rgb = template.rgb[i];
        if (rgb < 0) continue;
        let id = colours.indexOf(rgb);
        if (id < 0) id = colours.push(rgb) - 1;
        opaque.push(i % W, (i / W) | 0, id);
    }
    // one pixel of each colour is enough to pick the rarest from
    const anchors = colours.map((_, id) => {
        for (let k = 0; k < opaque.length; k += 3) if (opaque[k + 2] == id) return k / 3;
    });
    const flips = [[false, false], [true, false], [false, true], [true, true]].map(([hflip, vflip]) => {
        const points = new Int32Array(opaque.length);
        for (let k = 0; k < opaque.length; k += 3) {
            points[k] = hflip ? W - 1 - opaque[k] : opaque[k];
            points[k + 1] = vflip ? H - 1 - opaque[k + 1] : opaque[k + 1];
            points[k + 2] = opaque[k + 2];
        }
        return { hflip, vflip, points, anchors };
    });
    shape = { count: opaque.length / 3, colours, flips };
    shapes.set(template, shape);
    return shape;
}

const objectIds = new WeakMap();
let nextId = 0;
const idOf = (object) => {
    if (!objectIds.has(object)) objectIds.set(object, ++nextId);
    return objectIds.get(object);
};

// places where existing pieces of art match the frame exactly
function matchTemplates(sprite, templates) {
    const { color, colorMap, width, height } = sprite;
    const positions = new Map();
    color.forEach((c, i) => {
        if (!c) return;
        positions.has(c) ? positions.get(c).push(i) : positions.set(c, [i]);
    });

    const matches = [];
    const seen = new Set();
    templates.forEach((template) => {
        const shape = templateShape(template);
        if (shape.count < MIN_TEMPLATE_PIXELS) return;
        // the frame needs every colour the template has
        const ids = shape.colours.map((rgb) => colorMap.get(rgb));
        if (ids.some((c) => !c)) return;

        shape.flips.forEach(({ hflip, vflip, points, anchors }) => {
            // start from the pixel whose colour the frame has least of
            let anchor = 0;
            anchors.forEach((k) => {
                if (positions.get(ids[points[k * 3 + 2]]).length < positions.get(ids[points[anchor * 3 + 2]]).length) anchor = k;
            });
            const ax = points[anchor * 3], ay = points[anchor * 3 + 1];
            positions.get(ids[points[anchor * 3 + 2]]).forEach((i) => {
                const x = (i % width) - ax, y = ((i / width) | 0) - ay;
                const key = `${x},${y},${template.width},${template.height}`;
                if (seen.has(key)) return;
                const cover = [];
                for (let k = 0; k < points.length; k += 3) {
                    const px = x + points[k], py = y + points[k + 1];
                    if (px < 0 || py < 0 || px >= width || py >= height) return;
                    const j = py * width + px;
                    if (color[j] != ids[points[k + 2]]) return;
                    cover.push(j);
                }
                seen.add(key);
                matches.push({ x, y, width: template.width, height: template.height, template, hflip, vflip, cover });
            });
        });
    });
    return matches;
}

// take the matches that cover the most, then fill in around them
function seededCandidates(sprite, type, templates, strategies) {
    const matches = matchTemplates(sprite, templates);
    if (!matches.length) return [];

    const uncovered = Uint8Array.from(sprite.mask);
    const seeds = [];
    for (;;) {
        let best, bestGain = MIN_SEED_GAIN - 1;
        matches.forEach((match) => {
            let gain = 0;
            match.cover.forEach((i) => { gain += uncovered[i]; });
            if (gain > bestGain) {
                best = match;
                bestGain = gain;
            }
        });
        if (!best) break;
        best.cover.forEach((i) => { uncovered[i] = 0; });
        seeds.push(best);
    }
    if (!seeds.length) return [];
    if (!uncovered.some(Boolean)) return [seeds];

    const rest = { ...sprite, mask: uncovered };
    return strategies(rest).map((pieces) => refine([...seeds, ...pieces], sprite, type, seeds.length));
}

// a tile's 64 pixels, rgb or -1 for transparent, hashed
function hashTile(pixel) {
    let h = 2166136261;
    for (let i = 0; i < 64; i++) h = Math.imul(h ^ pixel(i & 7, i >> 3), 16777619);
    return h;
}

// hashes of a template's tiles in every flip, worked out once
const templateTiles = new WeakMap();
function tilesOf(template) {
    let hashes = templateTiles.get(template);
    if (hashes) return hashes;
    hashes = [];
    const W = template.width * 8;
    for (let c = 0; c < template.width; c++) {
        for (let r = 0; r < template.height; r++) {
            const at = (x, y) => template.rgb[(r * 8 + y) * W + c * 8 + x];
            let empty = true;
            for (let i = 0; i < 64 && empty; i++) empty = at(i & 7, i >> 3) < 0;
            if (empty) continue;
            [[false, false], [true, false], [false, true], [true, true]].forEach(([hflip, vflip]) => {
                hashes.push(hashTile((x, y) => at(hflip ? 7 - x : x, vflip ? 7 - y : y)));
            });
        }
    }
    templateTiles.set(template, hashes);
    return hashes;
}

// grid layouts on the offsets where the most of the frame's cells are tiles
// the art already has, so parts drawn before are cut the same way again.
// refine would move pieces off that grid, so they're offered unrefined too
function alignedCandidates(sprite, type, templates) {
    const known = new Set();
    templates.forEach((template) => tilesOf(template).forEach((h) => known.add(h)));
    if (!known.size) return [];

    const { mask, color, colorMap, width, height } = sprite;
    const rgbOf = [];
    colorMap.forEach((id, rgb) => { rgbOf[id] = rgb; });
    const pixel = (x, y) => (x < width && y < height && mask[y * width + x] ? rgbOf[color[y * width + x]] : -1);

    const offsets = [];
    for (let ox = 0; ox < 8; ox++) {
        for (let oy = 0; oy < 8; oy++) {
            const cells = getActiveCells(mask, width, height, ox, oy);
            const matched = cells.filter(([c, r]) => (
                known.has(hashTile((x, y) => pixel(ox + c * 8 + x, oy + r * 8 + y)))
            )).length;
            if (matched) offsets.push({ ox, oy, cells, matched });
        }
    }
    offsets.sort((a, b) => b.matched - a.matched || a.cells.length - b.cells.length);

    const results = [];
    offsets.slice(0, ALIGNED_OFFSETS).forEach(({ ox, oy, cells }) => {
        const pieces = byLayout('grid', cells, (layout) => pickBest(gridCandidates(layout), 'mappings'))
            .map(({ col, row, w, h }) => ({ x: ox + col * 8, y: oy + row * 8, width: w, height: h }));
        results.push(pieces, refine(pieces, sprite, type));
    });
    return results;
}

// light leaves out the slower strategies, for the parts of a sprite left
// around seeds or one half of a symmetric one
// pixels this frame shares with others of its size, covered by pieces that
// read only those pixels so every frame's copy is the same, then the rest
function commonCandidates(sprite, type, common, strategies) {
    const shared = prepare(common.buffer);
    if (!shared.mask.some(Boolean)) return [];
    const best = pickBest(strategies(shared).map((pieces) => refine(pieces, shared, type)), type);

    const uncovered = Uint8Array.from(sprite.mask);
    const seeds = best.map((piece) => {
        const cover = [];
        eachCovered(piece, shared.width, shared.height, shared.mask, (i) => cover.push(i));
        cover.forEach((i) => { uncovered[i] = 0; });
        return { ...piece, source: common.buffer, cover };
    });
    if (!uncovered.some(Boolean)) return [seeds];

    const rest = { ...sprite, mask: uncovered };
    return strategies(rest).map((pieces) => refine([...seeds, ...pieces], sprite, type, seeds.length));
}

function baseStrategies(sprite, type, light = false) {
    const { mask, width, height } = sprite;
    const free = freeMappings(mask, width, height, 'mappings');
    if (light) {
        const list = [gridMappings(mask, width, height, type), free];
        if (type == 'tiles') list.push(freeMappings(mask, width, height, 'tiles'));
        return list;
    }
    const list = [
        gridMappings(mask, width, height, type),
        free,
        bandMappings(mask, width, height, type),
        transposed(bandMappings, mask, width, height, type),
    ];
    // the tile-efficient free search never wins on pieces
    if (type == 'tiles') list.push(freeMappings(mask, width, height, 'tiles'));
    if (free.length <= EXACT_FREE_MAX_PIECES) {
        const exactPieces = exactFree(mask, width, height, free.length);
        if (exactPieces) list.push(exactPieces);
    }
    return list;
}

// templates: pieces of existing art, as { width, height, rgb } with -1 for
// transparent, that the frame can reuse. common: a buffer of just the pixels
// other frames share with this one. cost: how many new tiles a list of
// pieces needs; by default only reuse within the frame is counted
// overlap: whether pieces may draw over each other. without it only the
// candidates that keep them apart count; grid placements always do.
// align: also try cutting the frame on the grid that best lines up with
// tiles the art already has. grid: only keep candidates whose pieces all sit
// on one 8px grid
export function generateMappings(buffer, type, { templates = [], common, cost, overlap = false, align = false, grid = false } = {}) {
    const sprite = prepare(buffer);
    sprite.overlap = overlap;
    if (!sprite.mask.some(Boolean)) return [];
    const light = (target) => baseStrategies(target, type, true);

    const candidates = [
        ...baseStrategies(sprite, type).map((pieces) => refine(pieces, sprite, type)),
        ...symmetricCandidates(sprite, type, light),
        ...seededCandidates(sprite, type, templates, light),
        ...(common ? commonCandidates(sprite, type, common, light) : []),
        ...(align ? alignedCandidates(sprite, type, templates) : []),
        // refine can move pieces off the grid, so the grid layout goes in as is
        ...(grid ? [gridMappings(sprite.mask, sprite.width, sprite.height, type)] : []),
    ];
    const onGrid = (pieces) => pieces.every((p) => (
        (p.x - pieces[0].x) % 8 == 0 && (p.y - pieces[0].y) % 8 == 0
    ));

    // strategies often land on the same pieces, and costing them means planning
    // the whole frame, so each distinct list is costed once
    const costed = new Map();
    const tilesFor = (pieces) => {
        const k = pieces.map((p) => (
            `${p.x},${p.y},${p.width},${p.height},${p.hflip ? 1 : 0}${p.vflip ? 1 : 0},${p.template ? idOf(p.template) : ''},${p.source ? 's' : ''}`
        )).join(';');
        if (!costed.has(k)) costed.set(k, cost ? cost(pieces) : frameCost(sprite, pieces));
        return costed.get(k);
    };
    let best, bestScore;
    candidates.forEach((pieces) => {
        if (!overlap && hasOverlap(pieces)) return;
        if (grid && !onGrid(pieces)) return;
        const tiles = tilesFor(pieces);
        const s = type == 'tiles' ? [tiles, pieces.length] : [pieces.length, tiles];
        if (!best || better(s, bestScore)) {
            best = pieces;
            bestScore = s;
        }
    });

    return best.map(({ cover, ...piece }) => piece);
}

export function getMappings(canvas, ctx, type, options) {
    const { width, height } = canvas;
    return generateMappings(ctx.getImageData(0, 0, width, height), type, options);
}
