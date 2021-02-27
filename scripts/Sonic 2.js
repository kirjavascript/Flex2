// Flex 2 Mapping Definition - Sonic 2

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
    offsetTable(dc.w, quantity => (quantity * 8) + 2),
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
            mapping.yflip = read(1);
            mapping.xflip = read(1);
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
            write(1, mapping.yflip);
            write(1, mapping.xflip);
            write(11, mapping.offset);
            // 2 player
            write(1, mapping.priority);
            write(2, mapping.palette);
            write(1, mapping.yflip);
            write(1, mapping.xflip);
            write(11, Math.floor(mapping.offset / 2));
            // left
            write(dc.w, mapping.left);
        },
    ],
]);

dplcs({
    header: offsetTable(dc.w),
    sprites: [
        (dplc, i) => {
            if (i === 0) read(dc.b);
            dplc.size = read(nybble);
            dplc.art = read(nybble * 3);
        },
        (dplc, i) => {
            if (i === 0) write(dc.b, dplc.parent.length);
            write(nybble, dplc.size);
            write(nybblr * 3, dplc.art);
        },
    ],
});
