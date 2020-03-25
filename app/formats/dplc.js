import { parseDef } from './definitions';
import { errorMsg } from '#util/dialog';
import flattenDeep from 'lodash/flattenDeep';
import {
    readWord,
    readN,
    readBinary,
    getHeaders,
    parseSigned,
    padAndTruncate,
    numberToByteArray,
} from './util';

export function bufferToDPLCs(buffer, format) {
    const data = new Uint8Array(buffer);
    let dplcs = [];

    const headers = getHeaders(data);

    const { headerSize, dplcSize, dplcDef } = parseDef(format);

    headers.forEach((headerOffset) => {

        const dplcQty = readN(data, headerOffset, headerSize);
        const dplcOffset = headerOffset + headerSize;
        let sprites = [];

        // prevent crashes from incorrectly read header
        if (dplcQty > 100) return;

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

export function DPLCsToBuffer(dplcs, format) {
    const { headerSize, dplcSize, dplcDef } = parseDef(format);

    const frames = [];

    dplcs.forEach((pieces) => {
        const pieceBytes = [];

        pieces.forEach(({art, size}) => {
            const bits = [];

            dplcDef.forEach(({name, length}) => {
                if (name == 'size') {
                    bits.push(padAndTruncate(size - 1, length));
                }
                else if (name == 'art') {
                    bits.push(padAndTruncate(art, length));
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
    const framesArray =frames.map(({header, pieces}) => [header, pieces]);

    const bytes = flattenDeep([headerWords, framesArray]);

    return {
        chunk: new Buffer(Uint8Array.from(bytes)),
        frames: framesArray,
    };

}
