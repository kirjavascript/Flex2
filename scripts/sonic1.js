// Flex2 mapping definition - sonic 1 object sprites

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
info();
offsetTable(dc.w);
mappingHeader(
    (_mappings) => read(dc.b),
    (mappings) => write(dc.b, mappings.length),
);
mappings(
    (mapping) => {
        mapping.top = read(dc.b);
        read(nybble);
        mapping.width = read(2) + 1;
        mapping.height = read(2) + 1;
        mapping.priority = read(1);
        mapping.palette = read(2);
        mapping.yflip = read(1);
        mapping.xflip = read(1);
        mapping.offset = read(11);
        mapping.left = read(dc.w);
    },
    (mapping) => {
        write(dc.b, mapping.top);
        write(nybble, 0);
        write(2, mapping.width - 1);
        write(2, mapping.height - 1);
        write(1, mapping.priority);
        write(2, mapping.palette);
        write(1, mapping.yflip);
        write(1, mapping.xflip);
        write(11, mapping.offset);
        write(dc.w, mapping.left);
    },
);
dplcHeader(
    (_dplcs) => read(dc.b),
    (dplcs) => write(dc.b, dplcs.length),
);
dplcs(
    (dplc) => {
        dplc.size = read(nybble);
        dplc.offset = read(nybble * 3);
    },
    (dplc) => {
        write(nybble, dplc.size);
        write(nybblr * 3, dplc.offset);
    },
);
