export function chunkBytes(chunks) {
    const bytes = [];
    const bitBuffer = [];

    chunks.forEach(([, size, data]) => {
        const bits = data.toString(2).padStart(size, 0);
        bitBuffer.push(...bits);
        while (bitBuffer.length > 7) {
            const byte = parseInt(bitBuffer.splice(0, 8).join(''), 2);
            bytes.push(byte);
        }
    });
    return bytes;
}

export function writeBIN({ sections }) {
    return Buffer.from(Uint8Array.from(chunkBytes(sections.flat(3))));
}
