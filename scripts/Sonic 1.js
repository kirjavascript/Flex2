// Flex 2 Mapping Definition - Sonic 1

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
    offsetTable(dc.w, quantity => (quantity * 5) + 1),
    [
        ({ mapping, ref }, i) => {
            if (i === 0) {
                ref.quantity = read(dc.b);
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
            mapping.left = read(dc.b, signed);
            if (i === ref.quantity - 1) return endFrame;
        },
        ({ mapping, sprite }, i) => {
            if (i === 0) write(dc.b, sprite.length);
            write(dc.b, mapping.top);
            write(nybble, 0);
            write(2, mapping.width - 1);
            write(2, mapping.height - 1);
            write(1, mapping.priority);
            write(2, mapping.palette);
            write(1, mapping.vflip);
            write(1, mapping.hflip);
            write(11, mapping.art);
            write(dc.b, mapping.left);
        },
    ],
]);

dplcs([
    offsetTable(dc.w),
    [
        ({ mapping, ref }, i) => {
            if (i === 0) {
                ref.quantity = read(dc.b);
                if (ref.quantity === 0) return skipFrame;
            }
            mapping.size = read(nybble) + 1;
            mapping.art = read(nybble * 3);
            if (i === ref.quantity - 1) return endFrame;
        },
        ({ mapping, sprite }, i) => {
            if (i === 0) write(dc.b, sprite.length);
            write(nybble, mapping.size);
            write(nybblr * 3, mapping.art);
        },
    ],
]);
