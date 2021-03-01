
export function writeBIN({ sections }) {
    const chunks = sections.flat(3);

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


    return Buffer.from(Uint8Array.from(bytes));
}
