/*
original implementation/spec: naoto

snkenjoi: any chance you can give me a version of this with your own copyright notice? https://github.com/NaotoNTP/clownlzss/blob/NLZ-Support/nlz.c or a different implementation?
snkenjoi: I would probably rewrite it in JS, so if I have verbal approval I can go ahead with that
Naoto: That's fine with me
*/

// format: https://forums.sonicretro.org/threads/nlz-compression.43880/
// config: 0 = non-moduled, 1-5 = modules of 0x100 << config bytes

const MAX_LEN = 0x100;
const NEAR_DIST = 0x40;
const LITERAL_COST = 9;

function params(config) {
    if (!Number.isInteger(config) || config < 0 || config > 5) {
        throw new Error(`invalid NLZ config ${config}`);
    }
    const shift = config || 5;
    return {
        shift,
        window: 0x100 << shift,
        maxPacked: (0xFF >> shift) + 2,
        moduled: config !== 0,
    };
}

export function decompress(input) {
    const src = input instanceof Uint8Array ? input : Uint8Array.from(input);
    if (src.length < 4) throw new Error('NLZ data too short');
    const words = (src[0] << 8) | src[1];
    const fullModules = src[2];
    if (src[3] & 3 || src[3] > 5 << 2) throw new Error('invalid NLZ header');
    const { shift, window, moduled } = params(src[3] >> 2);
    if (!moduled && fullModules) throw new Error('invalid NLZ header');
    const lenMask = 0xFF >> shift;
    const out = [];
    let pos = 4;
    const read = () => {
        if (pos >= src.length) throw new Error('unexpected end of NLZ data');
        return src[pos++];
    };

    for (let m = 0; m <= fullModules; m++) {
        const start = out.length;
        const maxSize = m < fullModules ? window : words * 2;
        let desc = 0;
        let bits = 0;
        const bit = () => {
            if (!bits) {
                desc = read();
                bits = 8;
            }
            bits--;
            return (desc >> bits) & 1;
        };

        for (;;) {
            if (!bit()) {
                out.push(read());
                if (out.length - start > maxSize) throw new Error('NLZ module larger than header size');
                continue;
            }
            let dist, len;
            if (!bit()) {
                const b = read();
                dist = (b >> 2) + 1;
                len = b & 3;
                if (len) {
                    len += 1;
                } else {
                    const x = read();
                    if (!x) break;
                    len = x + 1;
                }
            } else {
                const hi = read();
                dist = (((hi & ~lenMask & 0xFF) << shift) | read()) + 1;
                len = hi & lenMask;
                len = len ? len + 2 : read() + 1;
            }
            const from = out.length - dist;
            if (from < 0) throw new Error('NLZ match before start of data');
            for (let i = 0; i < len; i++) out.push(out[from + i]);
            if (out.length - start > maxSize) throw new Error('NLZ module larger than header size');
        }
        const size = out.length - start;
        if (m < fullModules ? size !== window : (size + 1) >> 1 !== words) {
            throw new Error('NLZ module size does not match header');
        }
    }

    return Uint8Array.from(out);
}

export function compress(input, config = 0) {
    const data = input instanceof Uint8Array ? input : Uint8Array.from(input);
    const n = data.length;
    const { shift, window, maxPacked, moduled } = params(config);

    const matchCost = (dist, len) => {
        if (dist <= NEAR_DIST) return len <= 4 ? 2 + 8 : 2 + 16;
        if (len < 3) return 0;
        return len <= maxPacked ? 2 + 16 : 2 + 24;
    };

    // optimal parse; matches never cross a module boundary at either end,
    // since the decompressor works within a single module-sized buffer
    const cost = new Float64Array(n + 1).fill(Infinity);
    const lenAt = new Uint16Array(n + 1);
    const distAt = new Uint16Array(n + 1);
    cost[0] = 0;

    const head = new Int32Array(1 << 16).fill(-1);
    const chain = new Int32Array(n);
    const hash3 = i => ((data[i] << 8) ^ (data[i + 1] << 4) ^ data[i + 2]) & 0xFFFF;
    const boundary = i => moduled ? (Math.floor(i / window) + 1) * window : Infinity;

    for (let i = 0; i < n; i++) {
        const base = cost[i];
        if (base + LITERAL_COST < cost[i + 1]) {
            cost[i + 1] = base + LITERAL_COST;
            lenAt[i + 1] = 1;
            distAt[i + 1] = 0;
        }

        const limit = Math.min(MAX_LEN, n - i, boundary(i) - i);
        let best = 1;
        const tryMatch = j => {
            const max = Math.min(limit, boundary(j) - j);
            let len = 0;
            while (len < max && data[j + len] === data[i + len]) len++;
            const dist = i - j;
            for (let l = best + 1; l <= len; l++) {
                const c = matchCost(dist, l);
                if (c && base + c < cost[i + l]) {
                    cost[i + l] = base + c;
                    lenAt[i + l] = l;
                    distAt[i + l] = dist;
                }
            }
            if (len > best) best = len;
        };

        if (limit >= 2) {
            for (let d = 1; d <= NEAR_DIST && d <= i && best < limit; d++) tryMatch(i - d);
            if (limit >= 3) {
                for (let j = head[hash3(i)]; j >= 0 && i - j <= window && best < limit; j = chain[j]) {
                    if (i - j > NEAR_DIST) tryMatch(j);
                }
            }
        }
        if (i + 2 < n) {
            const h = hash3(i);
            chain[i] = head[h];
            head[h] = i;
        }
    }

    const tokens = [];
    for (let i = n; i > 0; i -= lenAt[i]) tokens.push(i);
    tokens.reverse();

    let fullModules = 0;
    let lastSize = n;
    if (moduled && n) {
        fullModules = Math.ceil(n / window) - 1;
        lastSize = n - fullModules * window;
    }
    const words = (lastSize + 1) >> 1;
    if (words > 0xFFFF || fullModules > 0xFF) {
        throw new Error(`data too large for NLZ config ${config}`);
    }

    const out = [words >> 8, words & 0xFF, fullModules, config << 2];
    let descPos, desc, bitsLeft;
    const beginDesc = () => {
        descPos = out.length;
        out.push(0);
        desc = 0;
        bitsLeft = 8;
    };
    const putBit = b => {
        if (!bitsLeft) {
            out[descPos] = desc;
            beginDesc();
        }
        desc = ((desc << 1) | b) & 0xFF;
        bitsLeft--;
    };
    const endModule = () => {
        putBit(1);
        putBit(0);
        out.push(0, 0);
        out[descPos] = (desc << bitsLeft) & 0xFF;
    };

    beginDesc();
    let pos = 0;
    for (const end of tokens) {
        const len = end - pos;
        const dist = distAt[end];
        if (!dist) {
            putBit(0);
            out.push(data[pos]);
        } else if (dist <= NEAR_DIST) {
            putBit(1);
            putBit(0);
            if (len <= 4) {
                out.push(((dist - 1) << 2) | (len - 1));
            } else {
                out.push((dist - 1) << 2, len - 1);
            }
        } else {
            putBit(1);
            putBit(1);
            const hi = ((dist - 1) & 0xFF00) >> shift;
            if (len <= maxPacked) {
                out.push(hi | (len - 2), (dist - 1) & 0xFF);
            } else {
                out.push(hi, (dist - 1) & 0xFF, len - 1);
            }
        }
        pos = end;
        if (moduled && pos % window === 0 && pos < n) {
            endModule();
            beginDesc();
        }
    }
    endModule();

    return Uint8Array.from(out);
}
