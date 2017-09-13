import chunk from 'lodash/chunk';
import flatten from 'lodash/flatten';

const sizeLookup = {
    'b': 1,
    'w': 2,
    'l': 4,
};

export function asmToBin(buffer) {

    const asm = buffer.toString()
        .replace(/\$|even|(;(.*?)$)/gm, '') // remove comments / even / $ (assume no decimal)
        .replace(/(^\s*$)/gm, ''); // remove empty lines

    const sections = asm.split(/^(.*?):/gm);
    // header contains a - symbol (assume no negatives in data sections)
    const headerIndex = sections.findIndex((f) => f.indexOf('-') != -1);
    const headers = sections[headerIndex];

    const dataSections = chunk(sections.splice(headerIndex + 1), 2)
        .map(([label, data]) => {
            const lines = data.split('\n');
            let bytes = [];
            lines.forEach((line) => {
                const sizeMatch = line.match(/dc\.(b|w|l)/);
                if (sizeMatch) {
                    const size = sizeLookup[sizeMatch[1]];
                    const fragments = line.replace(/dc\.(b|w|l)|\s/g, '').split(',');
                    // save each fragment into byte array based on size
                    fragments.forEach((fragment) => {
                        let hex = parseInt(fragment, 16);
                        let fragmentBytes = [];
                        for (let i = 0; i < size; i++) {
                            fragmentBytes.unshift(hex & 0xFF);
                            hex = hex >> 8;
                        }
                        bytes.push(...fragmentBytes);
                    });
                }
            });

            return {
                label,
                bytes,
            };
        });

    // assume word sized headers
    const headersList = headers
        .replace(/dc\.w/gm, '') // remove data annotation
        .replace(/\n/gm, ',') // change \n to comma
        .replace(/\s/gm, '') // strip whitespace
        .replace(/,$|^,/g, '') // strip trailing/beginning comma
        .split(','); // split by comma

    const headerSize = headersList.length * 2; // bytes

    const headerBytes = [];

    headersList.forEach((header) => {
        const dashIndex = header.indexOf('-');
        if (dashIndex == -1) {
            const value = parseInt(header, 16);
            headerBytes.push(value >> 8, value & 0xFF);
        }
        else {
            const label = header.slice(0, dashIndex);
            let value = headerSize;
            for (let i = 0; i < dataSections.length; i++) {
                if (label == dataSections[i].label) {
                    break;
                }
                value += dataSections[i].bytes.length;
            }

            headerBytes.push(value >> 8, value & 0xFF);
        }
    });

    const dataBytes = flatten(dataSections.map((d) => d.bytes));

    return [...headerBytes, ...dataBytes];
}
