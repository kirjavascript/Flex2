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

    const clone = new ImageData(
        Uint8ClampedArray.from(buffer.data),
        buffer.width,
        buffer.height,
    );

    const colorConvert = nearestColor(line);
    for (let j = 0; j < clone.data.length; j+=4) {
        if (clone.data[j+3] != 0) {
            const {R, G, B} = colorConvert({
                R: clone.data[j],
                G: clone.data[j+1],
                B: clone.data[j+2],
            });
            clone.data[j] = R;
            clone.data[j+1] = G;
            clone.data[j+2] = B;
        }
    }

    return clone;
}
