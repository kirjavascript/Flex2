// Flex2 Mapping Definition - Sonic 3 Objects

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
                write(11, mapping.offset);
                // left
                write(dc.w, mapping.left);
            };
        },
    ],
]);

dplcs([
    offsetTable(dc.w),
    [
        () => {
            const quantity = read(dc.w);
            return quantity > 0 && (({ mapping }, frameIndex) => {
                mapping.art = read(nybble * 3);
                mapping.size = read(nybble) + 1;
                if (frameIndex === quantity - 1) return endFrame;
            });
        },
        ({ sprite }) => {
            write(dc.w, sprite.length);
            return ({ mapping }) => {
                write(nybble * 3, mapping.art);
                write(nybble, mapping.size - 1);
            };
        },
    ],
]);
