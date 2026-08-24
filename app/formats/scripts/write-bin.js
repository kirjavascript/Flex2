// the type of a value is a symbol, which JSON leaves out, so frames that only
// differ by it would look alike
export const frameKey = (frames) => JSON.stringify(frames, (_, value) =>
    (typeof value === 'symbol' ? String(value) : value));

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
    // an offset table can point several entries at one frame, and then it hands
    // over the layout it worked those offsets out from
    const layout = sections.layout || sections;
    return Buffer.from(Uint8Array.from(chunkBytes(layout.flat(3))));
}
