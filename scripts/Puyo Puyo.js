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
    postRead,
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
], {
    // the size isn't stored: the game DMAs one slot of PLC Tiles per frame
    maxSize: () => config.dplcTiles || Infinity,
    maxEntries: 1,
});

function nextSprite(ref, start) {
    return (ref.global.headers || []).reduce(
        (next, header) => (header > start && header < next ? header : next),
        Infinity,
    );
}

function link(mapping) {
    return Number(mapping.metadata && mapping.metadata.link) || 0;
}

// the art label of each DPLC longword, in file order: undefined for raw dc.l
// and for dplcEntry with only a slot
function dplcArtLabels(source) {
    const labels = [];
    source.split('\n').forEach((line) => {
        const code = line.replace(/;.*/, '');
        const entry = code.match(/(?:^|\s)dplcEntry\s+([^,]+?)\s*(?:,\s*(.+?))?\s*$/i);
        if (entry) {
            labels.push(entry[2] !== undefined ? entry[1] : undefined);
            return;
        }
        const longs = code.match(/(?:^|\s)dc\.l\s+(.+?)\s*$/i);
        if (longs) longs[1].split(',').forEach(() => labels.push(undefined));
    });
    return labels;
}

// the label isn't assembled, so it's read from the source
postRead(({ dplcs, sources }) => {
    if (!dplcs || !sources.dplcs) return;
    const labels = dplcArtLabels(sources.dplcs);
    const entries = dplcs.flat();
    // anything cleverer than a flat list (includes, conditionals) can't be
    // matched up, so it gets no labels rather than wrong ones
    if (labels.length !== entries.length) return;
    entries.forEach((entry, i) => {
        if (labels[i]) entry.metadata.artLabel = labels[i];
    });
});

// an entry without a label is named after the others, so with ArtUnc_X_3 at
// slot 3, slot 7 becomes ArtUnc_X_7
function artLabel(metadata, slot, entries, label) {
    if (metadata?.artLabel) return metadata.artLabel;
    for (const { art, metadata: other } of entries) {
        const match = other?.artLabel?.match(/^(.*_)(\d+)$/);
        if (match && Number(match[2]) === art / config.dplcTiles) return match[1] + slot;
    }
    return `${label}_Art_${slot}`;
}

asm(({ addScript, importScript, writeMappings, writeDPLCs }) => {
    importScript('PuyoMapMacros.asm');
    addScript(`\nPuyoDPLCSlotSize = ${(config.dplcTiles || 0) * 0x20}\n`);

    writeMappings(({ label, sprites, renderHex, frameLabels }) => {
        const list = [];
        const { names, blocks } = frameLabels(
            // an empty sprite is a null entry, so it never takes a name
            (sprite) => sprite.mappings.length && sprite.mappings.map(mapping => {
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

                return `\tspritePiece ${pieceInfo}`;
            }),
        );
        const entryName = (i) => names[i] || '0';

        // @RadioTails Create the Equ Labels
        // sprites sharing a frame share its name, which is defined once, on the
        // first of them
        const equs = new Set();
        sprites.forEach((_, i) => {
            const name = entryName(i);
            if (equs.has(name)) return;
            equs.add(name);
            list.push(`Sprite_${name}:\tEqu ${i}`);
        });
        list.push('');
        list.push('; ---------------------------------------------------------------------------');
        list.push('');

        // @RadioTails Create the Mapping Table
        list.push(`${label}:\tmappingsTable`);
        sprites.forEach((_, i) => {
            list.push(`\tmappingsTableEntry.l\t${entryName(i)}`);
        });
        list.push('');
        list.push('; ---------------------------------------------------------------------------');
        list.push('');

        // @RadioTails Create the Sprites
        blocks.forEach(({ name, rows }) => {
            list.push(`${name}:\tspriteHeader`);
            list.push('\t; X, Y, Width, Height, Tile, X Flip, Y Flip, Palette, Priority, Link');
            list.push(...rows);
            list.push(`${name}_End`);
            list.push('');
            list.push('; ---------------------------------------------------------------------------');
            list.push('');
        });

        list.push('\teven');

        return list.join('\n');
    });

    writeDPLCs(({ label, sprites, renderHex }) => {
        const list = [`${label}:`, '\t; Art, Slot'];

        const entries = sprites.flatMap(({ dplcs }) => dplcs || []);
        entries.forEach(({ art, metadata }) => {
            const slot = art / config.dplcTiles;
            list.push(Number.isInteger(slot)
                ? `\tdplcEntry\t${artLabel(metadata, slot, entries, label)}, ${slot}`
                : `\tdc.l\t${renderHex(art * 0x20)}`);
        });

        list.push('', '\teven');

        return list.join('\n');
    });
});
