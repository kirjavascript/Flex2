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
            { value: 'objectFrame', label: 'Object (single frame)' },
            { value: 'objectPiece', label: 'Object (static piece)' },
            { value: 'player', label: 'Player' },
            { value: 'sonic', label: 'Sonic' },
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
// Sonic's frame list is a table of tables, which can be read but not written
const readOnly = format === 'sonic';
const hasOffsetTable = format === 'object' || isPlayer;
const hasFrameHeader = format !== 'objectPiece';

const unsupported = () => { throw new Error('unsupported'); };

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
    readOnly ? unsupported : ({ sprite }) => {
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
    readOnly ? unsupported : ({ sprite }) => {
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
    ...(format === 'sonic' ? [offsetTable(dc.w, { items: 251 })] : []),
    ...(hasOffsetTable ? [offsetTable(dc.w)] : []),
    mappingSection,
]);

dplcs([
    ...(format === 'sonic' ? [offsetTable(dc.w, { items: 251 })] : []),
    offsetTable(dc.w),
    dplcSection,
]);

asm(({ addScript, importScript, writeMappings, writeDPLCs }) => {
    if (!config.mapMacros) return;

    addScript(`
SonicMappingsVer := 3
SonicDplcVer := 3
    `);
    importScript('MapMacros.asm');

    // several table entries can point at the same frame, so the same symbol can
    // come back on more than one sprite - each emitted frame needs its own label
    const frameNames = (label, sprites, sanitizeLabel, key, allowBare) => {
        const used = new Set();
        return sprites.map((sprite, i) => {
            let name = sanitizeLabel(sprite.metadata && sprite.metadata[key]) ||
                (allowBare && sprites.length === 1 ? label : `${label}_${i}`);
            for (let attempt = 0; used.has(name); attempt++) {
                name = attempt ? `${label}_${i}_${attempt}` : `${label}_${i}`;
            }
            used.add(name);
            return name;
        });
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
     *
     * NOTE: for the Sonic format the frame list is a table of tables, but this
     * emits a single flat table, so the original structure isn't reproduced
     */
    writeMappings(({ label, sprites, renderHex, sanitizeLabel }) => {
        const list = [];
        // without an offset table a lone frame takes the label itself
        const names = frameNames(label, sprites, sanitizeLabel, 'label', !hasOffsetTable);

        if (format === 'objectPiece') {
            sprites.forEach((sprite, i) => {
                sprite.mappings.forEach((mapping, pieceIndex) => {
                    const prefix = pieceIndex === 0 ? `${names[i]}:` : '';
                    list.push(`${prefix}\tspritePiece ${pieceInfo(renderHex, mapping)}`);
                });
            });

            list.push('\teven');

            return list.join('\n');
        }

        if (hasOffsetTable) {
            list.push(`${label}: mappingsTable`);
            sprites.forEach((sprite, i) => {
                list.push(`\tmappingsTableEntry.w\t${names[i]}`);
            });
            list.push('');
        }

        sprites.forEach((sprite, i) => {
            list.push(`${names[i]}:\tspriteHeader`);

            sprite.mappings.forEach(mapping => {
                list.push(` spritePiece ${pieceInfo(renderHex, mapping)}`);
            });

            list.push(`${names[i]}_End`);
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });

    /**
     * MapMacros DPLC output
     */
    writeDPLCs(({ label, sprites, renderHex, sanitizeLabel }) => {
        const list = [];
        const names = frameNames(label, sprites, sanitizeLabel, 'plcLabel', false);
        const header = isPlayer ? 's3kPlayerDplcHeader' : 'dplcHeader';
        const entry = isPlayer ? 's3kPlayerDplcEntry' : 'dplcEntry';

        list.push(`${label}: mappingsTable`);
        sprites.forEach((sprite, i) => {
            list.push(`\tmappingsTableEntry.w\t${names[i]}`);
        });
        list.push('');

        sprites.forEach((sprite, i) => {
            list.push(`${names[i]}:\t${header}`);

            sprite.dplcs.forEach(dplc => {
                const dplcInfo = [
                    dplc.size,
                    dplc.art,
                ].map(renderHex).join(', ');

                list.push(` ${entry} ${dplcInfo}`);
            });

            list.push(`${names[i]}_End`);
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });
});
