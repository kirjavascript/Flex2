import { parseDef } from './definitions';
import { errorMsg } from '#util/dialog';
import flattenDeep from 'lodash/flattenDeep';
import {
    readWord,
    readN,
    readBinary,
    getHeaders,
    parseSigned,
    numberToByteArray,
    padAndTruncate,
    twosComplement,
} from './util';

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
    mappings.forEach((pieces, index) => {
        const pieceBytes = [];

        pieces.forEach((piece) => {
            const bits = [];

            mappingDef.forEach(({name, length}) => {
                if (['top', 'left'].includes(name)) {
                    bits.push(twosComplement(piece[name], length));
                }
                else if (['palette', 'art'].includes(name)) {
                    bits.push(padAndTruncate(piece[name], length));
                }
                else if (['width', 'height'].includes(name)) {
                    bits.push(padAndTruncate(piece[name] - 1, length));
                }
                else if (['priority', 'vflip', 'hflip'].includes(name)) {
                    bits.push(piece[name] ? '1' : '0');
                }
                else if (name == 'two') {
                    bits.push('0'.repeat(length));
                }
                else if (name == 'ignore') {
                    bits.push('0'.repeat(length));
                }
            });

            const bytes = bits.join``.match(/.{8}/g).map((d) => parseInt(d, 2));

            pieceBytes.push(bytes);
        });

        frames.push({
            header: numberToByteArray(pieceBytes.length, headerSize),
            pieces: pieceBytes,
            length: headerSize + pieceBytes.reduce((a, c) => a + c.length, 0),
        });
    });

    // headers are word sized
    const headerLength = frames.length * 2;
    const headers = [];

    let headerCounter = headerLength;

    frames.forEach((frame) => {
        headers.push(headerCounter);

        headerCounter += frame.length;
    });

    const headerWords = headers.map((num) => numberToByteArray(num, 2));

    const bytes = flattenDeep([
        headerWords,
        frames.map(({header, pieces}) => [header, pieces]),
    ]);

    // TODO: fix two player mode
    // TODO: support 0 header optimization
    // TODO: asm

    return new Buffer(Uint8Array.from(bytes));

}
