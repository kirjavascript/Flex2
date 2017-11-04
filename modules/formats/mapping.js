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
            const twoPlayerBits = [];

            mappingDef.forEach(({name, length}) => {
                if (['top', 'left'].includes(name)) {
                    bits.push(twosComplement(piece[name], length));
                }
                else if (['palette', 'art'].includes(name)) {
                    const value = padAndTruncate(piece[name], length);
                    bits.push(value);
                    if (name == 'palette') {
                        twoPlayerBits.push(value);
                    }
                    else if (name == 'art') {
                        const halfArt = padAndTruncate(0|(piece[name]/2), length);
                        twoPlayerBits.push(halfArt);
                    }
                }
                else if (['width', 'height'].includes(name)) {
                    bits.push(padAndTruncate(piece[name] - 1, length));
                }
                else if (['priority', 'vflip', 'hflip'].includes(name)) {
                    const value = piece[name] ? '1' : '0';
                    bits.push(value);
                    twoPlayerBits.push(value);
                }
                else if (name == 'two') {
                    bits.push('2'.repeat(length)); // 2 is a nice little placeholder
                }
                else if (name == 'ignore') {
                    bits.push('0'.repeat(length));
                }
            });

            // apply two player data
            let twoPlayerBitIndex = 0;
            const twoPlayerBitsConcat = twoPlayerBits.join``;
            const fixedBits = bits.map((bits) => {
                return [...bits].map((bit) => {
                    if (bit == '2') {
                        const twoPlayerBit = twoPlayerBitsConcat[twoPlayerBitIndex++];
                        return twoPlayerBit || '0';
                    }
                    else {
                        return bit;
                    }
                }).join``;
            }).join``;

            const bytes = fixedBits.match(/.{8}/g).map((d) => parseInt(d, 2));

            pieceBytes.push(bytes);
        });

        frames.push({
            header: pieceBytes.length,
            pieces: pieceBytes,
            length: headerSize + pieceBytes.reduce((a, c) => a + c.length, 0),
        });
    });

    // headers are word sized
    const headerLength = frames.length * 2;
    const headers = [];

    let headerCounter = headerLength;
    let zeroHeader = false;

    frames.forEach(({header, length}, index) => {
        // check for zero header optimization
        if (index == 0 && headerSize <= 2 && header == 0) {
            headers.push(0);
            zeroHeader = true;
        }
        else if (zeroHeader && header == 0) {
            headers.push(0);
        }
        // normal headers
        else {
            headers.push(headerCounter);
            headerCounter += length;
        }

    });

    const headerWords = headers.map((num) => numberToByteArray(num, 2));

    const bytes = flattenDeep([
        headerWords,
        frames.map(({header, pieces}) => {
            return (zeroHeader && header == 0)
                ? []
                : [numberToByteArray(header, headerSize), pieces];
        }),
    ]);

    return new Buffer(Uint8Array.from(bytes));

}
