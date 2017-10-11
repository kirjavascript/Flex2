import { environment } from '#store/environment';
import { closest } from 'color-diff';

function nearestColor(line = 0) {
    const palette = environment.palettesRGB[line]
        .slice(1) // ignore transparency
        .map(([R, G, B]) => ({R, G, B}));

    const cache = [];

    return (color) => {
        const preCalculated = cache.find((obj) => (
            obj.color.R == color.R &&
            obj.color.G == color.G &&
            obj.color.B == color.B
        ));

        if (preCalculated) {
            return preCalculated.result;
        }
        else {
            const result = closest(color, palette);

            cache.push({color, result});

            return result;
        }
    };
}

export function colorMatch(buffer, line = 0) {
    const colorConvert = nearestColor(line);
    for (let j = 0; j < buffer.data.length; j+=4) {
        if (buffer.data[j+3] != 0) {
            const {R, G, B} = colorConvert({
                R: buffer.data[j],
                G: buffer.data[j+1],
                B: buffer.data[j+2],
            });
            buffer.data[j] = R;
            buffer.data[j+1] = G;
            buffer.data[j+2] = B;
        }
    }
}
