// Flex2 Mapping Definition - Sonic 3&K Sonic

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
    offsetTable(dc.w, { items: 251 }),
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
        () => { throw new Error('unsupported'); },
    ],
]);

dplcs([
    offsetTable(dc.w, { items: 251 }),
    offsetTable(dc.w),
    [
        () => {
            const quantity = read(dc.w);
            return quantity > 0 && (({ mapping }, frameIndex) => {
                mapping.size = read(nybble) + 1;
                mapping.art = read(nybble * 3);
                if (frameIndex + 1 === quantity) return endFrame;
            });
        },
        () => { throw new Error('unsupported'); },
    ],
]);

asm(({ addScript, importScript, writeMappings, writeDPLCs }) => {
    addScript(`
SonicMappingsVer := 3
SonicDplcVer := 3
    `);
    importScript('MapMacros.asm');

    /**
     * MapMacros Mapping output
     *
     * remove this to output raw data instead
     */
    writeMappings(({ label, sprites, renderHex }) => {
        const list = [];

        list.push(`${label}: mappingsTable`);
        sprites.forEach((_, i) => {
	        list.push(`\tmappingsTableEntry.w\t${label}_${i}`);
        });
        list.push('');

        sprites.forEach((sprite, i) => {
            list.push(`${label}_${i}:\tspriteHeader`);

            sprite.mappings.forEach(mapping => {
                const pieceInfo = [
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

                list.push(` spritePiece ${pieceInfo}`);
            });

            list.push(`${label}_${i}_End`);
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });

    /**
     * MapMacros DPLC output
     *
     * remove this to output raw data instead
     */
    writeDPLCs(({ label, sprites, renderHex }) => {
        const list = [];

        list.push(`${label}: mappingsTable`);
        sprites.forEach((_, i) => {
	        list.push(`\tmappingsTableEntry.w\t${label}_${i}`);
        });
        list.push('');

        sprites.forEach((sprite, i) => {
            list.push(`${label}_${i}:\ts3kPlayerDplcEntry`);

            sprite.dplcs.forEach(dplc => {
                const pieceInfo = [
                    dplc.size,
                    dplc.art,
                ].map(renderHex).join(', ');

                list.push(` s3kPlayerDplcEntry ${pieceInfo}`);
            });

            list.push(`${label}_${i}_End`);
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });
});
