import { constants } from './run-script';
import { chunkBytes, frameKey } from './write-bin';

const sizes = {
    8: 'b',
    16: 'w',
    32: 'l',
};

export function sanitizeLabel(name) {
    if (!name) return name;
    let s = name.replace(/[^A-Za-z0-9_]/g, '_');
    if (/^[0-9]/.test(s)) s = '_' + s;
    return s || undefined;
}

// several table entries can point at the same frame, so the same name can come
// back on more than one sprite: identical data shares a single block, and only
// data that differs gets a name of its own. `body` is null for a frame nothing
// points at, which can never be shared
function labelPool() {
    const used = new Set();
    const shared = new Map();

    // names taken by something other than a frame, eg the tables themselves
    const reserve = (name) => { if (name) used.add(name); };

    const claim = (preferred, body, fallback) => {
        const key = body != null && `${preferred}\u0000${body}`;
        if (key && shared.has(key)) return { name: shared.get(key), emit: false };
        let name = preferred;
        for (let attempt = 1; used.has(name); attempt++) {
            name = fallback(attempt);
        }
        used.add(name);
        if (key) shared.set(key, name);
        return { name, emit: true };
    };

    return { claim, reserve };
}

/**
 * The frame naming an ASM writer needs, bound to the object being written;
 * `rows(sprite, i)` renders the data lines of a frame, without its label.
 *
 * frameLabels(rows) -> { names, blocks }
 *   names[i]  the name sprite i's table entry points at, or undefined when
 *             `rows` returned nothing, meaning the sprite has no frame at all
 *   blocks    the frames to emit, { name, rows }
 *
 * `table` says the frames sit behind an offset table: entries can then share a
 * frame, and without one a lone unnamed frame takes the object's label itself.
 */
export function makeFrameLabels({ label, sprites, key = 'label' }) {
    const tableKey = key === 'label' ? 'tableLabel' : 'plcTableLabel';

    return (rows, { table = true } = {}) => {
        const { claim, reserve } = labelPool();
        // the tables have names of their own, which no frame may be given
        if (table) {
            reserve(label);
            sprites.forEach(({ metadata = {} }) => {
                reserve(sanitizeLabel(metadata[tableKey]));
                if (metadata.table) reserve(`${label}_Table${Number(metadata.table) || 0}`);
            });
        }
        const autoName = (i, attempt) => {
            if (!table && !attempt && sprites.length === 1) return label;
            return attempt > 1 ? `${label}_${i}_${attempt - 1}` : `${label}_${i}`;
        };
        const names = [];
        const blocks = [];

        sprites.forEach((sprite, i) => {
            const body = rows(sprite, i);
            // a sprite with no frame of its own is left out of the naming
            if (!body) return;
            const { name, emit } = claim(
                sanitizeLabel(sprite.metadata && sprite.metadata[key]) || autoName(i, 0),
                table ? body.join('\n') : null,
                (attempt) => autoName(i, attempt),
            );
            names[i] = name;
            if (emit) blocks.push({ name, rows: body });
        });

        return { names, blocks };
    };
}

const isAddressList = (frames) =>
    frames.every(v => v.every(([type]) => type === constants.address));

export function writeASM(baseLabel, { sections }, sprites, nameKey = 'label') {
    const tableKey = nameKey === 'label' ? 'tableLabel' : 'plcTableLabel';
    const getLabel = addr => `${baseLabel}_${addr.toString(16).toUpperCase()}`;
    const metadataOf = i => (sprites && sprites[i] && sprites[i].metadata) || {};
    // a sprite is in the table of the last sprite tagged before it
    const spriteTables = [];
    for (let i = 0; sprites && i < sprites.length; i++) {
        const tag = metadataOf(i).table;
        spriteTables[i] = tag == null || tag === ''
            ? (spriteTables[i - 1] || 0)
            : Number(tag) || 0;
    }
    const tableOf = i => spriteTables[i] || 0;

    // tables sitting next to each other hold offsets from their own first entry
    const tableBase = [];
    const tableName = [];
    let cursor = 0;
    const labels = [];
    const addrLabels = new Map();
    const { claim, reserve } = labelPool();
    const hasTable = sections.some(section =>
        section.some(frames => frames.length && isAddressList(frames)));

    // the listing opens with the object's own label and each table takes one
    // too, so no frame may be given any of them
    reserve(baseLabel);
    spriteTables.forEach((table, i) => {
        if (tableName[table] != null) return;
        tableName[table] = sanitizeLabel(metadataOf(i)[tableKey]) ||
            (table ? `${baseLabel}_Table${table}` : baseLabel);
        reserve(tableName[table]);
    });
    sections.forEach(section => {
        section.forEach((frames, i) => {
            const meta = metadataOf(i);
            const addr = cursor / 8;
            const isTable = isAddressList(frames);
            let lbl = sanitizeLabel(meta[nameKey]) || getLabel(addr);
            const table = tableOf(i);
            if (tableBase[table] == null) {
                tableBase[table] = addr;
                if (tableName[table] == null) {
                    tableName[table] = sanitizeLabel(meta[tableKey]) ||
                        (table ? `${baseLabel}_Table${table}` : baseLabel);
                }
            }
            if (isTable) {
                addrLabels.set(addr, lbl);
                labels.push({ label: lbl, values: frames, table });
            } else {
                const { name, emit } = claim(
                    lbl,
                    hasTable ? frameKey(frames) : null,
                    (attempt) => getLabel(addr) + '_'.repeat(attempt - 1),
                );
                addrLabels.set(addr, name);
                // the frame keeps its place in the layout the offsets were
                // worked out from, it just is not written out again
                if (emit) labels.push({ label: name, values: frames, table });
            }

            frames.forEach(frame => {
                frame.forEach(([, size]) => {
                    cursor += size;
                });
            })
        });
    })

    const output = [`${baseLabel}:\n`];
    // the first table can be named too, the file object's label stays on top of it
    if (tableName[0] && tableName[0] !== baseLabel) {
        output.push(`${tableName[0]}:\n`);
    }
    let openTable = 0;
    labels.forEach(({ label, values, table }) => {
        const isTable = isAddressList(values);
        if (isTable && table !== openTable) {
            output.push(`${tableName[table]}:\n`);
            openTable = table;
        }
        if (!isTable) output.push(`${label}: `)
        values.forEach(value => {
            if (value.every(([type]) => type === constants.address)) {
                value.forEach(([, size, data]) => {
                    const tSize = sizes[size] || '?';
                    const addr = data + tableBase[table];
                    if (addrLabels.has(addr)) {
                        output.push(`\tdc.${tSize} ${addrLabels.get(addr)}-${tableName[table]}\n`);
                    } else {
                        output.push(`\tdc.${tSize} $${data.toString(16).toUpperCase()}\n`);
                    }

                });
            } else {
                const bytes = chunkBytes(value)
                    .map(d => '$' + d.toString(16).toUpperCase())
                    .join(', ');
                output.push(`\tdc.b ${bytes}\n`);
            }
        })
    });
    output.push('\teven')

    return output.join('');
}
