export function removeBackground(buffer) {
    // get top left pixel
    const [r, g, b, a] = buffer.data;
    // strip background colour
    if (a > 0x80) {
        // tfw lambdas are five times slower than a for loop...
        for (let j = 0; j < (buffer.data.length); j+=4) {
            if (
                 r == buffer.data[j] &&
                 g == buffer.data[j+1] &&
                 b == buffer.data[j+2]
             ) {
                buffer.data[j+3] = 0;
            }
        }
    }
}
