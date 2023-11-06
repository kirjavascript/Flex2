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
    config,
} = Flex2;

config(({ number }) => [
    number({
        name: 'artOffset',
        label: 'Art Offset',
    }),
]);

mappings([
    [
        () => {
            return (({ mapping }) => {
                read(nybble);
                mapping.width = read(2) + 1;
                mapping.height = read(2) + 1;
                mapping.top = read(dc.b, signed);
                mapping.art = read(dc.w) - config.artOffset;
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
                write(dc.w, mapping.art + config.artOffset);
                write(dc.b, mapping.left);
                const endByte = sprite.length - 1 === frameIndex
                    ? 0xFF
                    : 0;
                write(dc.b, endByte);
            };
        },
    ],
]);

dplcs([
    [
        () => {
            return (({ mapping }) => {
                const tiles = read(dc.w);
                const swapped = (tiles >> 8) + ((tiles & 0xFF) << 8);
                mapping.size = swapped / 0x10;
                mapping.metadata.dmaSrc = read(dc.w);
                mapping.art = read(12);
                mapping.metadata.unknown = read(4);
                mapping.metadata.dmaDst = read(dc.w);
                mapping.metadata.plcEnd = read(dc.w);

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
