// original algorithm Xenowhirl
// stole code from ChaseMor/pxt-arcade-rotsprite
// generated the rest with chatGPT

export default function rotSprite(image, angle) {
    image = scale2xImage(image);
    image = scale2xImage(image);
    image = scale2xImage(image);
    image = rotateAndReduceImage(image, angle);
    return image;
}

function scale2xImage(original) {
    let scaled = Pixels.create(original.width << 1, original.height << 1);
    for (let x = 0; x < original.width; x++) {
        for (let y = 0; y < original.height; y++) {
            const p = original.getPixel(x, y);
            const a = original.getPixel(x, y - 1);
            const b = original.getPixel(x + 1, y);
            const c = original.getPixel(x - 1, y);
            const d = original.getPixel(x, y + 1);
            if (c == a && c != d && a != b) {
                scaled.setPixel(x << 1, y << 1, a);
            } else {
                scaled.setPixel(x << 1, y << 1, p);
            }
            if (a == b && a != c && b != d) {
                scaled.setPixel((x << 1) + 1, y << 1, b);
            } else {
                scaled.setPixel((x << 1) + 1, y << 1, p);
            }
            if (d == c && d != b && c != a) {
                scaled.setPixel(x << 1, (y << 1) + 1, c);
            } else {
                scaled.setPixel(x << 1, (y << 1) + 1, p);
            }
            if (b == d && b != a && d != c) {
                scaled.setPixel((x << 1) + 1, (y << 1) + 1, d);
            } else {
                scaled.setPixel((x << 1) + 1, (y << 1) + 1, p);
            }
        }
    }
    return scaled;
}
function rotateAndReduceImage(original, angle) {
    let rotated = Pixels.create(original.width >> 3, original.height >> 3);

    const centerX = rotated.width >> 1;
    const centerY = rotated.height >> 1;

    for (let x = 0; x < rotated.width; x++) {
        for (let y = 0; y < rotated.height; y++) {
            let dir = Math.atan2(y - centerY, x - centerX);
            let mag = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) << 3;

            dir = dir - angle;

            let origX = Math.round((centerX << 3) + mag * Math.cos(dir));
            let origY = Math.round((centerY << 3) + mag * Math.sin(dir));

            if (
                origX >= 0 &&
                origX < original.width &&
                origY >= 0 &&
                origY < original.height
            ) {
                rotated.setPixel(x, y, original.getPixel(origX, origY));
            }
        }
    }

    return rotated;
}

export class Pixels {
    // The width and height of the image in pixels
    width;
    height;
    // A Uint8Array representing the colors of the pixels in the image
    pixels;

    // Constructor to create a new Image object with the given dimensions
    constructor(width, height, pixels) {
        this.width = width;
        this.height = height;
        this.pixels = pixels || new Uint32Array(width * height);
    }

    // Returns the color of the pixel at the given coordinates
    getPixel = (x, y) => {
        return this.pixels[y * this.width + x];
    };

    // Sets the color of the pixel at the given coordinates to the given color
    setPixel = (x, y, color) => {
        this.pixels[y * this.width + x] = color;
    };

    // Creates and returns a new Image object with the given dimensions
    static create = (width, height, pixels) => {
        return new Pixels(width, height, pixels);
    };

    // Returns a new Image object with the same dimensions and pixel colors as the original image
    clone = () => {
        const clonedImage = new Pixels(this.width, this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                clonedImage.setPixel(x, y, this.getPixel(x, y));
            }
        }
        return clonedImage;
    };
}
