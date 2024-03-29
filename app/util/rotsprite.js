// 3 shears

export function threeShears(spriteCanv, canvas, angle) {
    const spriteCtx = spriteCanv.getContext('2d');

    const flipped = angle > 90 && angle < 270;

    const diag = getRotateDiagonal(
        spriteCanv.width,
        spriteCanv.height,
    );
    const minXPad = 1 + (0 | (spriteCanv.width / 2));
    const overflow = diag.xMargin < minXPad ? minXPad - diag.xMargin : 0;
    const diagonal = diag.diagonal + overflow * 2;
    const xMargin = diag.xMargin + overflow;
    const yMargin = diag.yMargin + overflow;
    const width = diagonal;
    const height = diagonal;

    const copy = spriteCtx.getImageData(
        0,
        0,
        spriteCanv.width,
        spriteCanv.height,
    );


    spriteCanv.width = diagonal;
    spriteCanv.height = spriteCanv.width;

    if (flipped) {
        spriteCtx.putImageData(
            flipImageData(copy),
             xMargin + 1,
             yMargin + 1,
        );
    } else {
        spriteCtx.putImageData(copy, xMargin, yMargin);
    }

    const ctx = canvas.getContext('2d');
    canvas.width = diagonal;
    canvas.height = diagonal;

    // rotate

    const clampedAngle = flipped ? angle - 180 : angle;
    const theta = (clampedAngle * Math.PI) / 180;
    const alpha = -Math.tan(theta / 2);

    for (let y = 0; y < height; ++y) {
        const shear = Math.round((y - height / 2) * alpha);
        ctx.drawImage(spriteCanv, 0, y, width, 1, shear, y, width, 1);
    }
    spriteCtx.clearRect(0, 0, width, height);
    spriteCtx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (let x = 0; x < width; ++x) {
        const shear = Math.round((x - width / 2) * Math.sin(theta));
        ctx.drawImage(spriteCanv, x, 0, 1, height, x, shear, 1, height);
    }
    spriteCtx.clearRect(0, 0, width, height);
    spriteCtx.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; ++y) {
        const shear = Math.round((y - height / 2) * alpha);
        ctx.drawImage(spriteCanv, 0, y, width, 1, shear, y, width, 1);
    }

    // crop overflow
    const inner = ctx.getImageData(overflow, overflow, diag.diagonal, diag.diagonal);
    canvas.width = diag.diagonal;
    canvas.height = diag.diagonal;
    ctx.putImageData(inner, 0, 0);
}

function flipImageData(imageData) {
    const { width, height, data } = imageData;
    const rotatedImageData = new ImageData(width, height);
    const rotatedData = rotatedImageData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIndex = (y * width + x) * 4;
            const dstIndex = ((height - y - 1) * width + (width - x - 1)) * 4;
            rotatedData[dstIndex + 0] = data[srcIndex + 0];
            rotatedData[dstIndex + 1] = data[srcIndex + 1];
            rotatedData[dstIndex + 2] = data[srcIndex + 2];
            rotatedData[dstIndex + 3] = data[srcIndex + 3];
        }
    }

    return rotatedImageData;
}

// common

function getRotateDiagonal(width, height) {
    const diagonal =
        1 + (0 | (2 * Math.sqrt(width ** 2 / 4 + height ** 2 / 4)));

    const xMargin = Math.round((diagonal - width) / 2);
    const yMargin = Math.round((diagonal - height) / 2);

    return { diagonal: xMargin * 2 + width, xMargin, yMargin };
}

// rotsprite
//
// original algorithm Xenowhirl
// stole code from ChaseMor/pxt-arcade-rotsprite
// some generated with chatGPT

export function rotsprite(spriteCanv, canvas, angle) {
    const spriteCtx = spriteCanv.getContext('2d');
    const { width, height } = spriteCanv;
    const imageData = spriteCtx.getImageData(0, 0, width, height);
    const rotatedData = rotateImageData(imageData, angle, width, height);

    const ctx = canvas.getContext('2d');
    canvas.width = rotatedData.width;
    canvas.height = rotatedData.height;
    ctx.putImageData(rotatedData, 0, 0);
}

function rotateImageData(imageData, angle, width, height) {
    const { diagonal, xMargin, yMargin } = getRotateDiagonal(width, height);

    const spriteData = addMarginToImageData(imageData, xMargin, yMargin);

    const data = new Uint32Array(diagonal ** 2);

    for (let i = 0; i < spriteData.data.length; i += 4) {
        const r = spriteData.data[i];
        const g = spriteData.data[i + 1];
        const b = spriteData.data[i + 2];
        const a = spriteData.data[i + 3];
        data[i / 4] = (a << 24) + (r << 16) + (g << 8) + b;
    }

    const rotated = rotspriteAlg(
        new Pixels(diagonal, diagonal, data),
        (angle * Math.PI) / 180,
    ).pixels;

    const pixelData = new Uint8ClampedArray(data.length * 4);

    for (let i = 0; i < data.length; i++) {
        const value = rotated[i];

        pixelData[i * 4] = (value >> 16) & 0xff;
        pixelData[i * 4 + 1] = (value >> 8) & 0xff;
        pixelData[i * 4 + 2] = value & 0xff;
        pixelData[i * 4 + 3] = (value >> 24) & 0xff;
    }

    return new ImageData(pixelData, diagonal, diagonal);
}

function rotspriteAlg(image, angle) {
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

class Pixels {
    // The width and height of the image in pixels
    width;
    height;
    // A Uint32Array representing the colors of the pixels in the image
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

    scale = (factor) => {
        // Calculate the new dimensions of the scaled image
        const scaledWidth = this.width * factor;
        const scaledHeight = this.height * factor;

        // Create a new Image object with the new dimensions
        const scaledImage = new Pixels(scaledWidth, scaledHeight);

        // Loop through the pixels of the scaled image
        for (let y = 0; y < scaledHeight; y++) {
            for (let x = 0; x < scaledWidth; x++) {
                // Calculate the coordinates of the corresponding pixel in the original image
                const originalX = Math.floor(x / factor);
                const originalY = Math.floor(y / factor);

                // Set the pixel in the scaled image to the nearest pixel in the original image
                scaledImage.setPixel(x, y, this.getPixel(originalX, originalY));
            }
        }

        return scaledImage;
    };
}

function addMarginToImageData(imageData, xMargin, yMargin) {
    // Create a new ImageData object with the new dimensions, including the margin.
    const newImageData = new ImageData(
        imageData.width + xMargin * 2,
        imageData.height + yMargin * 2,
    );

    // Loop through the original image data and copy the pixel values to the new
    // ImageData object, taking the margin into account.
    for (let row = 0; row < imageData.height; row++) {
        for (let col = 0; col < imageData.width; col++) {
            const sourcePixel = [
                imageData.data[(row * imageData.width + col) * 4 + 0],
                imageData.data[(row * imageData.width + col) * 4 + 1],
                imageData.data[(row * imageData.width + col) * 4 + 2],
                imageData.data[(row * imageData.width + col) * 4 + 3],
            ];

            const destRow = row + yMargin;
            const destCol = col + xMargin;
            for (let i = 0; i < 4; i++) {
                newImageData.data[
                    (destRow * newImageData.width + destCol) * 4 + i
                ] = sourcePixel[i];
            }
        }
    }

    return newImageData;
}
