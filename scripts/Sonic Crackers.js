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
} = Flex2;

mappings([
    [
        () => {
            return (({ mapping, ref }) => {
                if (!ref.global._artPieces) {
                    ref.global._artPieces = [];
                    ref.global.cleanup.push(({ sprites }) => {
                        const pieces = ref.global._artPieces;
                        if (!pieces.length) return;
                        const minArt = pieces.reduce((m, p) => Math.min(m, p.art), Infinity);
                        if (minArt > 0) {
                            pieces.forEach(p => { p.art -= minArt; });
                        }
                        if (sprites[0]) {
                            if (!sprites[0].metadata) sprites[0].metadata = {};
                            sprites[0].metadata.artOffset = minArt;
                        }
                    });
                }
                read(nybble);
                mapping.width = read(2) + 1;
                mapping.height = read(2) + 1;
                mapping.top = read(dc.b, signed);
                mapping.art = read(dc.w);
                ref.global._artPieces.push(mapping);
                mapping.left = read(dc.b, signed);
                mapping.palette = 0;
                mapping.priority = 0;
                mapping.vflip = 0;
                mapping.hflip = 0;
                if (read(dc.b) === 0xFF) return endFrame;
            });
        },
        ({ sprite, ref }) => {
            if (ref.global._artOffset == null) {
                ref.global._artOffset = sprite.metadata?.artOffset || 0;
            }
            return ({ mapping }, frameIndex) => {
                write(nybble, 0);
                write(2, mapping.width - 1);
                write(2, mapping.height - 1);
                write(dc.b, mapping.top);
                write(dc.w, mapping.art + ref.global._artOffset);
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
            return (({ mapping, ref }) => {
                if (!ref.global._dplcPieces) {
                    ref.global._dplcPieces = [];
                    ref.global.cleanup.push(({ sprites }) => {
                        const pieces = ref.global._dplcPieces;
                        if (!pieces.length) return;
                        const minArt = pieces.reduce((m, p) => Math.min(m, p.art), Infinity);
                        if (minArt > 0) {
                            pieces.forEach(p => { p.art -= minArt; });
                        }
                        if (sprites[0]) {
                            if (!sprites[0].metadata) sprites[0].metadata = {};
                            sprites[0].metadata.dplcArtOffset = minArt;
                        }
                    });
                }
                mapping.size = swapBytes(read(dc.w)) / 0x10;
                mapping.metadata.dmaSrc = read(dc.w);
                mapping.art = read(12);
                ref.global._dplcPieces.push(mapping);
                mapping.metadata.unknown = read(4);
                mapping.metadata.dmaDst = read(dc.w);
                mapping.metadata.plcEnd = read(dc.w);
                return endFrame;
            });
        },
        ({ sprite, ref }) => {
            if (ref.global._dplcArtOffset == null) {
                ref.global._dplcArtOffset = sprite.metadata?.dplcArtOffset || 0;
            }
            return ({ mapping }) => {
                write(dc.w, swapBytes(mapping.size * 0x10));
                write(dc.w, mapping.metadata.dmaSrc || 0);
                write(12, mapping.art + ref.global._dplcArtOffset);
                write(4, mapping.metadata.unknown || 0);
                write(dc.w, mapping.metadata.dmaDst || 0);
                write(dc.w, mapping.metadata.plcEnd || 0);
                return endFrame;
            };
        },
    ],
]);
