import { parseDef } from './definitions';
import { readWord, readN, readBinary, getHeaders, parseSigned } from './util';
import { errorMsg } from '#util/dialog';

export function bufferToDPLCs(buffer, format) {
    const data = new Uint8Array(buffer);
    let dplcs = [];

    const headers = getHeaders(data);

    const { headerSize, dplcSize, dplcDef } = parseDef(format);

    headers.forEach((headerOffset) => {

        const dplcQty = readN(data, headerOffset, headerSize);
        const dplcOffset = headerOffset + headerSize;
        let sprites = [];

        for (let i = 0; i < dplcQty; i++) {
            // convert each line to a binary string to easily extract properties
            const binStr = readBinary(data, dplcOffset + (dplcSize * i), dplcSize);
            const obj = {};
            let index = 0;

            dplcDef.forEach(({name, length}) => {
                // extract prop and convert to int
                const binFragment = binStr.slice(index, index + length);
                const value = parseInt(binFragment, 2);

                if (name == 'size') {
                    obj[name] = value + 1;
                }
                else if (name == 'art') {
                    obj[name] = value;
                }

                index += length;
            });

            sprites.push(obj);
        }


        dplcs.push(sprites);
    });

    return dplcs;
}
