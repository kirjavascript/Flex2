import { constants } from './run-script';
import { chunkBytes } from './write-bin';

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
    const used = new Set();
    sections.forEach(section => {
        section.forEach((frames, i) => {
            const meta = metadataOf(i);
            const addr = cursor / 8;
            const isTable = isAddressList(frames);
            let lbl = sanitizeLabel(meta[nameKey]) || getLabel(addr);
            // several table entries can point at the same frame, so the same
            // name can come back on more than one sprite
            if (!isTable) {
                while (used.has(lbl)) {
                    lbl = lbl === getLabel(addr) ? `${lbl}_` : getLabel(addr);
                }
                used.add(lbl);
            }
            const table = tableOf(i);
            if (tableBase[table] == null) {
                tableBase[table] = addr;
                tableName[table] = sanitizeLabel(meta[tableKey]) ||
                    (table ? `${baseLabel}_Table${table}` : baseLabel);
            }
            addrLabels.set(addr, lbl);
            labels.push({ label: lbl, values: frames, table });

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
