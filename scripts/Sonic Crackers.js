// Flex 2 Mapping Definition - Sonic Crackers

const {
    mappings,
    dplcs,
    write,
    read,
    dc,
    nybble,
    endFrame,
    signed,
    postRead,
} = Flex2;

mappings([
    [
        () => {
            return (({ mapping }) => {
                read(nybble);
                mapping.width = read(2) + 1;
                mapping.height = read(2) + 1;
                mapping.top = read(dc.b, signed);
                const tile = read(dc.w);
                mapping.art = tile & 0x7FF;
                mapping.priority = (tile >> 15) & 1;
                mapping.palette = (tile >> 13) & 3;
                mapping.vflip = (tile >> 12) & 1;
                mapping.hflip = (tile >> 11) & 1;
                mapping.left = read(dc.b, signed);
                if (read(dc.b) === 0xFF) return endFrame;
            });
        },
        ({ environment }, spriteIndex) => {
            const dplcPieces = environment?.dplcs?.[spriteIndex] || [];
            const regions = buildVramRegions(dplcPieces);
            return ({ mapping, sprite }, frameIndex) => {
                const tile = unrebaseArt(mapping.art, regions)
                    | (mapping.priority << 15)
                    | (mapping.palette << 13)
                    | (mapping.vflip << 12)
                    | (mapping.hflip << 11);
                write(nybble, 0);
                write(2, mapping.width - 1);
                write(2, mapping.height - 1);
                write(dc.b, mapping.top);
                write(dc.w, tile);
                write(dc.b, mapping.left);
                write(dc.b, sprite.length - 1 === frameIndex ? 0xFF : 0);
            };
        },
    ],
]);

function swapBytes(word) {
    return (word >> 8) + ((word & 0xFF) << 8);
}

dplcs([
    [
        () => {
            return (({ mapping }) => {
                mapping.size = swapBytes(read(dc.w)) / 0x10;
                mapping.metadata.dmaSrc = read(dc.w);
                mapping.art = read(12);
                mapping.metadata.unknown = read(4);
                mapping.metadata.dmaDst = read(dc.w);
                const plcEnd = read(dc.w);
                mapping.metadata.plcEnd = plcEnd;
                if (plcEnd === 0xFFFF) return endFrame;
            });
        },
        ({ environment }) => {
            const artBase = environment?.dplcs?.[0]?.[0]?.metadata?.artBase || 0;
            return ({ mapping }) => {
                write(dc.w, swapBytes(mapping.size * 0x10));
                write(dc.w, mapping.metadata.dmaSrc || 0);
                write(12, mapping.art + artBase);
                write(4, mapping.metadata.unknown || 0);
                write(dc.w, mapping.metadata.dmaDst || 0);
                write(dc.w, mapping.metadata.plcEnd || 0);
                if (mapping.metadata.plcEnd === 0xFFFF) return endFrame;
            };
        },
    ],
]);

function buildVramRegions(dplcPieces) {
    const regions = [];
    let localArt = 0;
    for (const piece of dplcPieces) {
        const vramBase = (piece.metadata?.dmaDst || 0) / 0x20;
        regions.push({ vramBase, localArt, size: piece.size });
        localArt += piece.size;
    }
    return regions;
}

function rebaseArt(vramArt, regions) {
    for (const { vramBase, localArt, size } of regions) {
        if (vramArt >= vramBase && vramArt < vramBase + size) {
            return (vramArt - vramBase) + localArt;
        }
    }
    return vramArt;
}

function unrebaseArt(art, regions) {
    for (const { vramBase, localArt, size } of regions) {
        if (art >= localArt && art < localArt + size) {
            return (art - localArt) + vramBase;
        }
    }
    return art;
}

postRead(({ mappings, dplcs }) => {
    if (mappings && dplcs) {
        mappings.forEach((sprite, i) => {
            const regions = buildVramRegions(dplcs[i] || []);
            sprite.forEach(piece => { piece.art = rebaseArt(piece.art, regions); });
        });
        const allPieces = dplcs.flat();
        if (allPieces.length) {
            const minArt = allPieces.reduce((m, p) => Math.min(m, p.art), Infinity);
            if (minArt > 0) {
                allPieces.forEach(p => { p.art -= minArt; });
            }
            if (!dplcs[0][0].metadata) dplcs[0][0].metadata = {};
            dplcs[0][0].metadata.artBase = minArt;
        }
    }
});
