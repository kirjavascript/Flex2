// Flex2 Mapping Definition - Sonic 3

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
            write(11, mapping.offset);
            // left
            write(dc.w, mapping.left);
        },
    ],
]);

dplcs([
    offsetTable(dc.w),
    [
        ({ mapping, ref }, i) => {
            if (i === 0) {
                ref.quantity = read(dc.w);
                if (ref.quantity === 0) return skipFrame;
            }
            mapping.size = read(nybble) + 1;
            mapping.art = read(nybble * 3);
            if (i === ref.quantity - 1) return endFrame;
        },
        ({ mapping, sprite }, i) => {
            if (i === 0) write(dc.w, sprite.length);
            write(nybble, mapping.size);
            write(nybblr * 3, mapping.art);
        },
    ],
]);
