import { mapDefS2, parseDef } from './definitions';
import { readWord, readN, readBinary, getHeaders } from './util';
import { errorMsg } from '#util/dialog';

export function bufferToMappings(buffer, format) {
    const data = new Uint8Array(buffer);
    let mappings = [];

    const headers = getHeaders(data);

    const { headerSize, mappingSize, mappingDef } = parseDef(mapDefS2);

    headers.forEach((headerOffset) => {

        const mappingQty = readN(data, headerOffset, headerSize);
        const mappingOffset = headerOffset + headerSize;
        let sprites = [];

        for (let i = 0; i < mappingQty; i++) {
            // convert each line to a binary string to easily extract properties
            const binStr = readBinary(data, mappingOffset + (mappingSize * i), mappingSize);
            const obj = {};
            let index = 0;

            mappingDef.forEach(({name, length}) => {
                // extract prop and convert to int
                const value = parseInt(binStr.slice(index, index + length), 2);

                if (['top', 'left', 'palette', 'art'].includes(name)) {
                    obj[name] = value;
                }
                else if (['width', 'height'].includes(name)) {
                    obj[name] = value + 1;
                }
                else if (['priority', 'vflip', 'hflip'].includes(name)) {
                    obj[name] = !!value;
                }

                index += length;
            });

            sprites.push(obj);
        }


        mappings.push(sprites);
    });

    return mappings;
}
