// Flex2 Mapping Definition

const {
    info,
    offsetTable,
    mapping,
    mappingHeader,
    write,
    read,
    nybble,
    dc,
} = Flex2;

label('Sonic 1');
offsetTable(dc.w, 'mappings');
mappings(
    (mapping, i) => {
        if (i === 0) read(dc.b);
        mapping.top = read(dc.b);
        read(nybble);
        mapping.width = read(2) + 1;
        mapping.height = read(2) + 1;
        mapping.priority = read(1);
        mapping.palette = read(2);
        mapping.yflip = read(1);
        mapping.xflip = read(1);
        mapping.offset = read(11);
        mapping.left = read(dc.b);
    },
    (mapping, i) => {
        if (i === 0) write(dc.b, mapping.parent.length);
        write(dc.b, mapping.top);
        write(nybble, 0);
        write(2, mapping.width - 1);
        write(2, mapping.height - 1);
        write(1, mapping.priority);
        write(2, mapping.palette);
        write(1, mapping.yflip);
        write(1, mapping.xflip);
        write(11, mapping.offset);
        write(dc.b, mapping.left);
    },
);
offsetTable(dc.w, 'dplcs');
dplcs(
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
);
