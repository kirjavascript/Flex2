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
    asm,
    config,
} = Flex2;

config(({ checkbox }) => [
    checkbox({
        name: 'mapMacros',
        label: 'Use MapMacros',
    }),
]);

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
                read(dc.w);
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
                write(11, mapping.art);
                // 2 player
                write(1, mapping.priority);
                write(2, mapping.palette);
                write(1, mapping.vflip);
                write(1, mapping.hflip);
                write(11, Math.floor(mapping.art / 2));
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
                mapping.size = read(nybble) + 1;
                mapping.art = read(nybble * 3);
                if (frameIndex === quantity - 1) return endFrame;
            });
        },
        ({ sprite }) => {
            write(dc.w, sprite.length);
            return ({ mapping }) => {
                write(nybble, mapping.size - 1);
                write(nybble * 3, mapping.art);
            };
        },
    ],
]);

asm(({ addScript, importScript, writeMappings, writeDPLCs }) => {
    if (!config.mapMacros) return;

    addScript(`
SonicMappingsVer := 2
SonicDplcVer := 2
    `);
    importScript('MapMacros.asm');

    /**
     * MapMacros Mapping output
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
     */
    writeDPLCs(({ label, sprites, renderHex }) => {
        const list = [];

        list.push(`${label}: mappingsTable`);
        sprites.forEach((_, i) => {
	        list.push(`\tmappingsTableEntry.w\t${label}_${i}`);
        });
        list.push('');

        sprites.forEach((sprite, i) => {
            list.push(`${label}_${i}:\tdplcHeader`);

            sprite.dplcs.forEach(dplc => {
                const pieceInfo = [
                    dplc.size,
                    dplc.art,
                ].map(renderHex).join(', ');

                list.push(` dplcEntry ${pieceInfo}`);
            });

            list.push(`${label}_${i}_End`);
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });
});
