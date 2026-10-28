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
                mapping.priority = read(1);
                mapping.palette = read(2);
                mapping.vflip = read(1);
                mapping.hflip = read(1);
                mapping.art = read(11);
                mapping.left = read(dc.b, signed);
                if (read(dc.b) === 0xFF) return endFrame;
            });
        },
        ({ environment }, spriteIndex) => {
            const dplcPieces = environment?.dplcs?.[spriteIndex] || [];
            const regions = buildVramRegions(dplcPieces, environment);
            return ({ mapping, sprite }, frameIndex) => {
                write(nybble, 0);
                write(2, mapping.width - 1);
                write(2, mapping.height - 1);
                write(dc.b, mapping.top);
                write(1, mapping.priority);
                write(2, mapping.palette);
                write(1, mapping.vflip);
                write(1, mapping.hflip);
                write(11, unrebaseArt(mapping.art, regions));
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
                // 0xFFFF ends the frame, anything else continues it
                if (read(dc.w) === 0xFFFF) return endFrame;
            });
        },
        ({ environment, sprite }) => {
            const artBase = environment?.spriteMetadata?.[0]?.artBase || 0;
            const filled = fillPLCs(sprite, environment);
            return ({ mapping }, frameIndex) => {
                const metadata = mapping.metadata || {};
                write(dc.w, swapBytes(mapping.size * 0x10));
                write(dc.w, filled[frameIndex].dmaSrc);
                write(12, mapping.art + artBase);
                write(4, metadata.unknown || 0);
                write(dc.w, filled[frameIndex].dmaDst);
                write(dc.w, frameIndex === sprite.length - 1 ? 0xFFFF : 0);
            };
        },
    ],
], {
    maxSize: 0xFFF,
    // contiguous sections with the same DMA addresses would overwrite each
    // other in VRAM, so they are written as one
    mergeContiguous: true,
});

// where each of a frame's entries reads from and loads to. entries made in
// Flex rather than read may not say, so they take the object's ROM bank and
// VRAM slot from an entry that does, each loading after the one before it
function fillPLCs(dplcPieces, environment) {
    const known = (environment?.dplcs || []).flat()
        .find((piece) => piece.metadata?.dmaDst !== undefined) || { metadata: {} };
    const filled = [];
    dplcPieces.forEach((piece, i) => {
        const previous = filled[i - 1];
        filled.push({
            dmaSrc: piece.metadata?.dmaSrc ?? known.metadata.dmaSrc ?? 0,
            dmaDst: piece.metadata?.dmaDst
                ?? (previous ? previous.dmaDst + dplcPieces[i - 1].size * 0x20 : known.metadata.dmaDst ?? 0),
        });
    });
    return filled;
}

function buildVramRegions(dplcPieces, environment) {
    const filled = fillPLCs(dplcPieces, environment);
    let localArt = 0;
    return dplcPieces.map((piece, i) => {
        const region = { vramBase: filled[i].dmaDst / 0x20, localArt, size: piece.size };
        localArt += piece.size;
        return region;
    });
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

postRead(({ mappings, dplcs, spriteMetadata }) => {
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
            if (spriteMetadata) {
                if (!spriteMetadata[0]) spriteMetadata[0] = {};
                spriteMetadata[0].artBase = minArt;
            }
        }
    }
});
