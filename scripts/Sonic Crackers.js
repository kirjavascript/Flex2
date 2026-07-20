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
                mapping.art = read(dc.w);
                mapping.left = read(dc.b, signed);
                mapping.palette = 0;
                mapping.priority = 0;
                mapping.vflip = 0;
                mapping.hflip = 0;
                if (read(dc.b) === 0xFF) return endFrame;
            });
        },
        ({ environment }) => {
            const artOffset = environment?.spriteMetadata?.[0]?.artOffset || 0;
            return ({ mapping, sprite }, frameIndex) => {
                write(nybble, 0);
                write(2, mapping.width - 1);
                write(2, mapping.height - 1);
                write(dc.b, mapping.top);
                write(dc.w, mapping.art + artOffset);
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
                mapping.metadata.plcEnd = read(dc.w);
                return endFrame;
            });
        },
        ({ environment }) => {
            const dplcArtOffset = environment?.spriteMetadata?.[0]?.dplcArtOffset || 0;
            return ({ mapping }) => {
                write(dc.w, swapBytes(mapping.size * 0x10));
                write(dc.w, mapping.metadata.dmaSrc || 0);
                write(12, mapping.art + dplcArtOffset);
                write(4, mapping.metadata.unknown || 0);
                write(dc.w, mapping.metadata.dmaDst || 0);
                write(dc.w, mapping.metadata.plcEnd || 0);
                return endFrame;
            };
        },
    ],
]);

function normalizeArt(sprites) {
    const pieces = sprites.flat();
    if (!pieces.length) return 0;
    const minArt = pieces.reduce((m, p) => Math.min(m, p.art), Infinity);
    if (minArt > 0) {
        pieces.forEach(p => { p.art -= minArt; });
    }
    return minArt;
}

postRead(({ mappings, dplcs }) => {
    if (mappings) {
        const offset = normalizeArt(mappings);
        if (mappings[0]) {
            if (!mappings[0].metadata) mappings[0].metadata = {};
            mappings[0].metadata.artOffset = offset;
        }
    }
    if (dplcs) {
        const offset = normalizeArt(dplcs);
        if (dplcs[0]) {
            if (!dplcs[0].metadata) dplcs[0].metadata = {};
            dplcs[0].metadata.dplcArtOffset = offset;
        }
    }
});
