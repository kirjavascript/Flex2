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
        ({ mapping, ref }, i) => {
            if (i === 0) {
                ref.quantity = read(dc.w);
                if (ref.quantity === 0) return skipFrame;
            }
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
            if (i === ref.quantity - 1) return endFrame;
        },
        ({ mapping, sprite }, i) => {
            if (i === 0) write(dc.w, sprite.length);
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
    return 0x31E;
}

dplcs([
    offsetTable(dc.w),
    [
        ({ mapping, ref }, i, spriteIndex) => {
            if (i === 0) {
                ref.quantity = read(dc.w);
                if (ref.quantity === 0) return skipFrame;
            }
            mapping.size = read(nybble) + 1;
            mapping.art = getOffset(spriteIndex) + (read(nybble * 3) / 16);
            if (i === ref.quantity - 1) return endFrame;
        },
        ({ mapping, sprite }, i, spriteIndex) => {
            if (i === 0) write(dc.w, sprite.length);
            write(nybble, mapping.size);
            write(nybblr * 3, (mapping.art - getOffset(spriteIndex)) * 16);
        },
    ],
]);
