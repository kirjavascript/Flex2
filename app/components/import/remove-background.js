export function removeBackground(buffer) {
    // get top left pixel
    const [r, g, b, a] = buffer.data;
    // strip background colour
    if (a > 0x80) {
        for (let j = 0; j < (buffer.data.length); j+=4) {
            if (
                 r === buffer.data[j] &&
                 g === buffer.data[j+1] &&
                 b === buffer.data[j+2]
             ) {
                buffer.data[j+3] = 0;
            }
        }
    }

    return buffer;
}
