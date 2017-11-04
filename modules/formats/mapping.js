import { parseDef } from './definitions';
import { readWord, readN, readBinary, getHeaders, parseSigned } from './util';
import { errorMsg } from '#util/dialog';

export function bufferToMappings(buffer, format) {
    const data = new Uint8Array(buffer);
    let mappings = [];

    const headers = getHeaders(data);

    const { headerSize, mappingSize, mappingDef } = parseDef(format);

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
                const binFragment = binStr.slice(index, index + length);
                const value = parseInt(binFragment, 2);

                if (['top', 'left'].includes(name)) {
                    obj[name] = parseSigned(binFragment);
                }
                else if (['palette', 'art'].includes(name)) {
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

export function mappingsToBuffer(mappings, format) {

    const { headerSize, mappingSize, mappingDef } = parseDef(format);

    const frames = [];

    mappings.forEach(({art, top, left, priority, palette, hflip, vflip, width, height}) => {
        const bytes = [];
        console.log(art);

        mappingDef.forEach(({name, length}) => {
            console.log(name, length);

        });


    });

    console.log(JSON.stringify(frames, null, 4));

    // get frames from mapping def
    // add frame header size
    // get header

}
