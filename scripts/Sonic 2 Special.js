// Flex 2 Mapping Definition - Sonic 2 Special Stage

const {
    mappings,
    dplcs,
    offsetTable,
    write,
    read,
    dc,
    nybble,
    endFrame,
    skipFrame,
    signed,
} = Flex2;

mappings([
    offsetTable(dc.w),
    [
        () => {
            const quantity = read(dc.w);
            return quantity > 0 && (({ mapping }, frameIndex) => {
                mapping.top = read(dc.b, signed);
                read(nybble);
                mapping.width = read(2) + 1;
                mapping.height = read(2) + 1;
                mapping.priority = read(1);
                mapping.palette = read(2);
                mapping.vflip = read(1);
                mapping.hflip = read(1);
                mapping.art = read(11);
                read(dc.w);
                mapping.left = read(dc.w, signed);
                if (frameIndex === quantity - 1) return endFrame;
            });
        },
        ({ sprite }) => {
            write(dc.w, sprite.length);
            return ({ mapping }) => {
                // top
                write(dc.b, mapping.top);
                write(nybble, 0);
                // size
                write(2, mapping.width - 1);
                write(2, mapping.height - 1);
                // 1 player
                write(1, mapping.priority);
                write(2, mapping.palette);
                write(1, mapping.vflip);
                write(1, mapping.hflip);
                write(11, mapping.art);
                // 2 player
                write(1, mapping.priority);
                write(2, mapping.palette);
                write(1, mapping.vflip);
                write(1, mapping.hflip);
                write(11, Math.floor(mapping.art / 2));
                // left
                write(dc.w, mapping.left);
            };
        },
    ],
]);

function getOffset(i) {
    if (i < 4) return 0;
    if (i < 0xC) return 0x58;
    if (i < 0x10) return 0x124;
    if (i < 0x12) return 0x171;
    if (i < 0x16) return 0x183;
    if (i < 0x1E) return 0x1C0;
    if (i < 0x22) return 0x264;
    if (i < 0x24) return 0x29E;
    if (i < 0x2B) return 0x2AE;
    if (i < 0x32) return 0x2E3;
    return i;
}

dplcs([
    offsetTable(dc.w),
    [
        () => {
            const quantity = read(dc.w);
            return quantity > 0 && (({ mapping }, frameIndex, spriteIndex) => {
                mapping.size = read(nybble) + 1;
                mapping.art = getOffset(spriteIndex) + (read(nybble * 3) / 16);
                if (frameIndex === quantity - 1) return endFrame;
            });
        },
        ({ sprite }) => {
            write(dc.w, sprite.length);
            return ({ mapping }, _frameIndex, spriteIndex) => {
                write(nybble, mapping.size - 1);
                write(nybble * 3, (mapping.art - getOffset(spriteIndex)) * 16);
            };
        },
    ],
]);
