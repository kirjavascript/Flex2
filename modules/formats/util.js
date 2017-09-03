export function getHeaders(data) {
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
