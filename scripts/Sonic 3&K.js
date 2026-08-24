// Flex2 Mapping Definition - Sonic 3&K

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

config(({ select, checkbox }) => [
    select({
        name: 'format',
        label: 'Format',
        options: [
            { value: 'object', label: 'Object' },
            { value: 'player', label: 'Player' },
            { value: 'sonic', label: 'Sonic' },
            { value: 'objectFrame', label: 'Single Frame' },
            { value: 'objectPiece', label: 'Static' },
        ],
        default: 'object',
    }),
    checkbox({
        name: 'mapMacros',
        label: 'Use MapMacros',
        default: true,
    }),
]);

const format = config.format;

// players use Sonic 2's DPLC format, everything else uses the S3K one
const isPlayer = format === 'player' || format === 'sonic';
// Sonic's frames are split over a normal and a super table, each sprite is
// tagged with the table it belongs to in its metadata
const offsetTableOptions = format === 'sonic' ? { tables: 'auto' } : {};
const hasOffsetTable = format === 'object' || isPlayer;
const hasFrameHeader = format !== 'objectPiece';

const readPiece = (mapping) => {
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
};

const writePiece = (mapping) => {
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
    // left
    write(dc.w, mapping.left);
};

const mappingSection = [
    () => {
        const quantity = hasFrameHeader ? read(dc.w) : 1;
        return quantity > 0 && (({ mapping }, frameIndex) => {
            readPiece(mapping);
            if (frameIndex === quantity - 1) return endFrame;
        });
    },
    ({ sprite }) => {
        if (hasFrameHeader) write(dc.w, sprite.length);
        return ({ mapping }) => writePiece(mapping);
    },
];

const dplcSection = [
    () => {
        const quantity = read(dc.w);
        if (isPlayer) {
            return quantity > 0 && (({ mapping }, frameIndex) => {
                mapping.size = read(nybble) + 1;
                mapping.art = read(nybble * 3);
                if (frameIndex + 1 === quantity) return endFrame;
            });
        }
        if (quantity === 0xFFFF) return;
        return ({ mapping }, frameIndex) => {
            mapping.art = read(nybble * 3);
            mapping.size = read(nybble) + 1;
            if (frameIndex === quantity) return endFrame;
        };
    },
    ({ sprite }) => {
        if (isPlayer) {
            write(dc.w, sprite.length);
            return ({ mapping }) => {
                write(nybble, mapping.size - 1);
                write(nybble * 3, mapping.art);
            };
        }
        write(dc.w, sprite.length - 1);
        return ({ mapping }) => {
            write(nybble * 3, mapping.art);
            write(nybble, mapping.size - 1);
        };
    },
];

mappings([
    ...(hasOffsetTable ? [offsetTable(dc.w, offsetTableOptions)] : []),
    mappingSection,
]);

dplcs([
    offsetTable(dc.w, offsetTableOptions),
    dplcSection,
]);

asm(({ addScript, importScript, writeMappings, writeDPLCs }) => {
    if (!config.mapMacros) return;

    addScript(`
SonicMappingsVer := 3
SonicDplcVer := 3
    `);
    importScript('MapMacros.asm');

    // sprites are grouped into consecutive tables by their metadata: only the
    // sprite that opens a table is tagged, and it names the table too
    const tableEntries = (label, sprites, names, sanitizeLabel, key) => {
        const list = [];
        let table = null;
        let current = 0;

        sprites.forEach((sprite, i) => {
            const tag = sprite.metadata && sprite.metadata.table;
            if (tag != null && tag !== '') current = Number(tag) || 0;
            if (current !== table) {
                const named = sanitizeLabel(sprite.metadata && sprite.metadata[key]);
                if (table !== null) list.push('');
                // a named first table keeps the file object's label on top of it
                if (!current && named && named !== label) list.push(`${label}:`);
                list.push(`${named || (current ? `${label}_Table${current}` : label)}: mappingsTable`);
                table = current;
            }
            list.push(`\tmappingsTableEntry.w\t${names[i]}`);
        });
        list.push('');

        return list;
    };

    const pieceInfo = (renderHex, mapping) => [
        mapping.left,
        mapping.top,
        mapping.width,
        mapping.height,
        mapping.art,
        mapping.hflip,
        mapping.vflip,
        mapping.palette,
        mapping.priority,
    ].map(renderHex).join(', ');

    /**
     * MapMacros Mapping output
     */
    writeMappings(({ label, sprites, renderHex, sanitizeLabel, frameLabels }) => {
        const list = [];
        const { names, blocks } = frameLabels(
            (sprite) => sprite.mappings.map(mapping => ` spritePiece ${pieceInfo(renderHex, mapping)}`),
            { table: hasOffsetTable },
        );

        if (format === 'objectPiece') {
            blocks.forEach(({ name, rows }) => {
                rows.forEach((row, pieceIndex) => {
                    const prefix = pieceIndex === 0 ? `${name}:` : '';
                    list.push(`${prefix}\t${row.trim()}`);
                });
            });

            list.push('\teven');

            return list.join('\n');
        }

        if (hasOffsetTable) {
            list.push(...tableEntries(label, sprites, names, sanitizeLabel, 'tableLabel'));
        }

        blocks.forEach(({ name, rows }) => {
            list.push(`${name}:\tspriteHeader`);
            list.push(...rows);
            list.push(`${name}_End`);
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });

    /**
     * MapMacros DPLC output
     */
    writeDPLCs(({ label, sprites, renderHex, sanitizeLabel, frameLabels }) => {
        const list = [];
        const header = isPlayer ? 's3kPlayerDplcHeader' : 'dplcHeader';
        const entry = isPlayer ? 's3kPlayerDplcEntry' : 'dplcEntry';
        const { names, blocks } = frameLabels(
            (sprite) => sprite.dplcs.map(dplc => {
                const dplcInfo = [
                    dplc.size,
                    dplc.art,
                ].map(renderHex).join(', ');

                return ` ${entry} ${dplcInfo}`;
            }),
        );

        list.push(...tableEntries(label, sprites, names, sanitizeLabel, 'plcTableLabel'));

        blocks.forEach(({ name, rows }) => {
            list.push(`${name}:\t${header}`);
            list.push(...rows);
            list.push(`${name}_End`);
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });
});
