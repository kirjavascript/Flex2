import { constants } from './run-script';
import { chunkBytes } from './write-bin';

const sizes = {
    8: 'b',
    16: 'w',
    32: 'l',
};

export function writeASM(baseLabel, { sections }) {
    const getLabel = addr => `${baseLabel}_${addr.toString(16).toUpperCase()}`;
    let cursor = 0;
    const labels = [];
    const labelCache = new Set([]);
    sections.forEach(section => {
        section.forEach(frames => {
            const lbl = getLabel(cursor / 8);
            labelCache.add(lbl);
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
        output.push(`${label}: `)
        values.forEach(value => {
            if (value.every(([type]) => type === constants.address)) {
                value.forEach(([, size, data]) => {
                    const tSize = sizes[size] || '?';
                    const tLabel = getLabel(data);
                    if (labelCache.has(tLabel)) {
                        output.push(`\tdc.${tSize} ${tLabel}-${baseLabel}\n`);
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
