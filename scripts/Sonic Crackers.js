// Flex 2 Mapping Definition - Sonic Crackers

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
    asm,
} = Flex2;

mappings([
    [
        () => {
            return (({ mapping }) => {
                read(nybble);
                mapping.width = read(2) + 1;
                mapping.height = read(2) + 1;
                mapping.top = read(dc.b, signed);
                mapping.art = read(dc.w) - 1692;
                mapping.left = read(dc.b, signed);
                mapping.palette = 0;
                mapping.priority = 0;
                mapping.vflip = 0;
                mapping.hflip = 0
                if (read(dc.b) === 0xFF) return endFrame;
            });
        },
        ({ sprite }) => {
            return ({ mapping }, frameIndex) => {
                write(nybble, 0);
                write(2, mapping.width - 1);
                write(2, mapping.height - 1);
                write(dc.b, mapping.top);
                write(dc.w, mapping.art + 1692);
                write(dc.b, mapping.left);
                // 0 or FF depending on last one
            };
        },
    ],
]);

dplcs([
    [
        () => {
            return (({ mapping }) => {
                const tiles = read(dc.w);
                read(dc.w); // dma src
                const addr = read(12);
                read(4);
                read(dc.w); // dma dst
                read(dc.w); // end of plc

                const swapped = (tiles >> 8) + ((tiles & 0xFF) << 8);
                mapping.size = swapped / 0x10;
                mapping.art = addr;
                return endFrame;
            });
        },
        ({ sprite }) => {
            // write(dc.b, sprite.length);
            // return ({ mapping }) => {
            //     write(nybble, mapping.size - 1);
            //     write(nybble * 3, mapping.art);
            // };
        },
    ],
]);
