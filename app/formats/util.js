export function getHeaders(data) {
    // https://github.com/sonicretro/SonLVL/blob/master/SonLVLAPI/LevelData.cs#L1466-L1481
    let a = 0x7FFF; // headers are twos complement
    let headers = [];
    for (let i = 0; i < data.length && i < a; i += 2) {
        let header = readWord(data, i) & 0x7FFF;
        headers.push(header);
        if (header < a && !(header == 0)) {
            a = header;
        }
    }
    return headers;
}

export function readWord(data, index) {
    return (data[index] << 8) + data[index + 1];
}

export function readN(data, index, size) {
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

export function readBinary(data, index, size) {
    const arr = Array.from(data.slice(index, index + size));
    return arr.map((value) => {
        return value.toString(2).padStart(8, '0');
    }).join``;
}

export function parseSigned(value) { // takes binary string
    // no radix as this only makes sense for base-2
    if (+value[0]) {
        // if negative
        return ((1 << value.length) - parseInt(value, 2)) * -1;
    }
    else {
        return parseInt(value.slice(1), 2);
    }
}

export function numberToByteArray(num, length) {
    // length = bytes
    const binStr = padAndTruncate(num, length * 8);
    return binStr.match(/.{8}/g).map((d) => parseInt(d, 2));
}

export function padAndTruncate(value, length) {
    // length = bits
    const binStr = value.toString(2).padStart(length, '0');
    const startSlice = binStr.length - length;
    return binStr.slice(startSlice, startSlice + length);
}

export function twosComplement(value, bitCount) {
    let binaryStr;

    if (value >= 0) {
        let twosComp = value.toString(2);
        binaryStr    = padAndTruncate(twosComp, (bitCount || twosComp.length));
    } else {
        binaryStr = (Math.pow(2, bitCount) + value).toString(2);
    }

    return `${binaryStr}`.padStart(bitCount, '0');
}
