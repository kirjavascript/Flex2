// Flex 2 Mapping Definition - Puyo Puyo / Dr. Robotnik's Mean Bean Machine

const {
    mappings,
    dplcs,
    offsetTable,
    write,
    read,
    dc,
    nybble,
    endFrame,
    signed,
    asm,
    config,
} = Flex2;

config(({ number }) => [
    number({
        name: 'tileOffset',
        label: 'Tile Offset',
        default: 0,
    }),
    number({
        name: 'dplcTiles',
        label: 'PLC Tiles',
        default: 0,
    }),
]);

mappings([
    offsetTable(dc.l),
    [
        ({ getCursor }) => {
            const start = getCursor();
            const quantity = read(dc.w);
            return quantity > 0 && (({ mapping, ref }, frameIndex) => {
                mapping.top = read(dc.w, signed);
                read(nybble);
                mapping.width = read(2) + 1;
                mapping.height = read(2) + 1;
                mapping.metadata.link = read(dc.b);
                mapping.priority = read(1);
                mapping.palette = read(2);
                mapping.vflip = read(1);
                mapping.hflip = read(1);
                mapping.art = read(11) - config.tileOffset;
                mapping.left = read(dc.w, signed);
                // some sprites declare more pieces than they store and run into
                // the next sprite on purpose, so stop at the next pointer too
                if (frameIndex === quantity - 1) return endFrame;
                if (getCursor() >= nextSprite(ref, start)) return endFrame;
            });
        },
        ({ sprite }) => {
            write(dc.w, sprite.length);
            return ({ mapping }) => {
                write(dc.w, mapping.top);
                write(nybble, 0);
                write(2, mapping.width - 1);
                write(2, mapping.height - 1);
                write(dc.b, link(mapping));
                write(1, mapping.priority);
                write(2, mapping.palette);
                write(1, mapping.vflip);
                write(1, mapping.hflip);
                write(11, mapping.art + config.tileOffset);
                write(dc.w, mapping.left);
            };
        },
    ],
]);

dplcs([
    [
        () => ({ mapping }) => {
            mapping.art = read(dc.l) / 0x20;
            mapping.size = config.dplcTiles;
            return endFrame;
        },
        () => ({ mapping }) => {
            write(dc.l, mapping.art * 0x20);
            return endFrame;
        },
    ],
]);

function nextSprite(ref, start) {
    return (ref.global.headers || []).reduce(
        (next, header) => (header > start && header < next ? header : next),
        Infinity,
    );
}

function link(mapping) {
    return Number(mapping.metadata && mapping.metadata.link) || 0;
}

asm(({ addScript, importScript, writeMappings, writeDPLCs }) => {
    importScript('PuyoMapMacros.asm');
    addScript(`\nPuyoDPLCSlotSize = ${(config.dplcTiles || 0) * 0x20}\n`);

    writeMappings(({ label, sprites, renderHex, sanitizeLabel }) => {
        const list = [];
        const names = sprites.map((sprite, i) => (
            sanitizeLabel(sprite.metadata && sprite.metadata.label) || `${label}_${i}`
        ));

        // @RadioTails Create the Equ Labels
        sprites.forEach((sprite, i) => {
            list.push(`Sprite_${sprite.mappings.length ? names[i] : '0'}:\tEqu ${i}`);
        });
        list.push('');
        list.push('; ---------------------------------------------------------------------------');
        list.push('');

        // @RadioTails Create the Mapping Table
        list.push(`${label}:\tmappingsTable`);
        sprites.forEach((sprite, i) => {
            list.push(`\tmappingsTableEntry.l\t${sprite.mappings.length ? names[i] : '0'}`);
        });
        list.push('');
        list.push('; ---------------------------------------------------------------------------');
        list.push('');

        // @RadioTails Create the Sprites
        sprites.forEach((sprite, i) => {
            if (!sprite.mappings.length) return;

            list.push(`${names[i]}:\tspriteHeader`);
            list.push('\t; X, Y, Width, Height, Tile, X Flip, Y Flip, Palette, Priority, Link');

            sprite.mappings.forEach(mapping => {
                const pieceInfo = [
                    mapping.left,
                    mapping.top,
                    mapping.width,
                    mapping.height,
                    mapping.art + config.tileOffset,
                    Number(mapping.hflip),
                    Number(mapping.vflip),
                    mapping.palette,
                    Number(mapping.priority),
                    link(mapping),
                ].map(renderHex).join(', ');

                list.push(`\tspritePiece ${pieceInfo}`);
            });

            list.push(`${names[i]}_End`);
            list.push('');
            list.push('; ---------------------------------------------------------------------------');
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });

    writeDPLCs(({ label, sprites, renderHex }) => {
        const list = [`${label}:`, ''];

        sprites.forEach(({ dplcs: entries }) => {
            entries.forEach(({ art }) => {
                const slot = art / config.dplcTiles;
                list.push(Number.isInteger(slot)
                    ? `\tdplcEntry\t${slot}`
                    : `\tdc.l\t${renderHex(art * 0x20)}`);
            });
        });

        list.push('', '\teven');

        return list.join('\n');
    });
});
