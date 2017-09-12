import chunk from 'lodash/chunk';

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
            lines.forEach((line) => {
                const sizeMatch = line.match(/dc\.(b|w|l)/);
                if (sizeMatch) {
                    const size = sizeLookup[sizeMatch[1]];
                    const fragments = line.replace(/dc\.(b|w|l)|\s/g, '').split(',');
                    console.log(fragments);
                    // save each fragment into byte array based on size

                }
            });

            return {
                label,
            };
        });

    // support zero in headers

    console.log(JSON.stringify(dataSections, null, 4));

}
