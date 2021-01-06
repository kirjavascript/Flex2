// Flex 2 Mapping Definition - Sonic 1

const {
    mappings,
    dplcs,
    offsetTable,
    write,
    read,
    dc,
    nybble,
} = Flex2;

mappings({
    header: offsetTable(dc.w), // [read, write]
    sprites: [
        (mapping, i) => {
            if (i === 0) mapping.ref.endIndex = read(dc.b);
            mapping.top = read(dc.b);
            read(nybble);
            mapping.width = read(2) + 1;
            mapping.height = read(2) + 1;
            mapping.priority = read(1);
            mapping.palette = read(2);
            mapping.vflip = read(1);
            mapping.hflip = read(1);
            mapping.offset = read(11);
            mapping.left = read(dc.b);
            if (i > mapping.ref.endIndex) return end;
        },
        (mapping, i) => {
            if (i === 0) write(dc.b, mapping.parent.length);
            write(dc.b, mapping.top);
            write(nybble, 0);
            write(2, mapping.width - 1);
            write(2, mapping.height - 1);
            write(1, mapping.priority);
            write(2, mapping.palette);
            write(1, mapping.vflip);
            write(1, mapping.hflip);
            write(11, mapping.offset);
            write(dc.b, mapping.left);
        },
    ],
});

dplcs({
    header: offsetTable(dc.w),
    sprites: [
        (dplc, i) => {
            if (i === 0) read(dc.b);
            dplc.size = read(nybble);
            dplc.offset = read(nybble * 3);
        },
        (dplc, i) => {
            if (i === 0) write(dc.b, dplc.parent.length);
            write(nybble, dplc.size);
            write(nybblr * 3, dplc.offset);
        },
    ],
});
