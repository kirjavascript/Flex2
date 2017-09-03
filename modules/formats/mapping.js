import { mapDefS2, parseMapDef } from './definitions';
import { errorMsg } from '#util/dialog';

function readWord(data, index) {
    return (data[index] << 8) + data[index + 1];
}

function readN(data, index, size) {
    if (size > 6) {
        errorMsg('Error (readN)', 'Potential integer overflow');
        throw new Error('Potential integer overflow');
    }
    let value = 0;
    for (let i = 0; i < size; i++) {
        value = (value << 8) + data[index + i];
    }
    return value;
}

function readBinary(data, index, size) {
    const arr = Array.from(data.slice(index, index + size));
    return arr.map((value) => {
        return value.toString(2).padStart(8, '0');
    }).join``;
}

function getHeaders(data) {
    let a = 0x7FFF; // ???
    let headers = [];
    for (let i = 0; i < data.length && i != a; i += 2) {
        let header = readWord(data, i);
        headers.push(header);
        if (header < a && !(header == 0)) {
            a = header;
        }
    }
    return headers;
}

export function bufferToMappings(buffer) {
    const data = new Uint8Array(buffer);
    let mappings = [];

    const headers = getHeaders(data);

    const { headerSize, mappingSize, mappingDef } = parseMapDef(mapDefS2);

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
