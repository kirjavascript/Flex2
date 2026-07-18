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

export function writeASM(baseLabel, { sections }, sprites) {
    const getLabel = addr => `${baseLabel}_${addr.toString(16).toUpperCase()}`;
    let cursor = 0;
    const labels = [];
    const addrLabels = new Map();
    sections.forEach(section => {
        section.forEach((frames, i) => {
            const meta = sprites && sprites[i] && sprites[i].metadata;
            const addr = cursor / 8;
            const lbl = sanitizeLabel(meta && meta.name) || getLabel(addr);
            addrLabels.set(addr, lbl);
            labels.push([ lbl, frames ]);

            frames.forEach(frame => {
                frame.forEach(([, size]) => {
                    cursor += size;
                });
            })
        });
    })

    const output = [`${baseLabel}:\n`];
    labels.forEach(([label, values]) => {
        const isTable = values.every(v => v.every(([type]) => type === constants.address));
        if (!isTable) output.push(`${label}: `)
        values.forEach(value => {
            if (value.every(([type]) => type === constants.address)) {
                value.forEach(([, size, data]) => {
                    const tSize = sizes[size] || '?';
                    if (addrLabels.has(data)) {
                        output.push(`\tdc.${tSize} ${addrLabels.get(data)}-${baseLabel}\n`);
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
