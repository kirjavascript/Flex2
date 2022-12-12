import React, { useState, useEffect, useRef } from 'react';
import { environment } from '#store/environment';
import { exportSprite } from '#formats/image';
import rotSprite, { Pixels } from '#util/rotsprite';

export function Rotate() {
    return null;
    const canvasRef = useRef();
    const [angle, setAngle] = useState(45);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const spriteCanv = exportSprite(environment.currentSprite);
        const spriteCtx = spriteCanv.getContext('2d');

        const imageData = spriteCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = new Uint32Array(imageData.width * imageData.height);

        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            data[i / 4] = (r << 16) + (g << 8) + b;
        }

        const rotated = rotSprite(
            new Pixels(imageData.width, imageData.height, data),
            angle
        ).pixels;

        const pixelData = new Uint8ClampedArray(data.length * 4);

        for (let i = 0; i < data.length; i++) {
            const value = rotated[i];

            pixelData[i * 4] = (value >> 16) & 0xFF;
            pixelData[i * 4 + 1] = (value >> 8) & 0xFF;
            pixelData[i * 4 + 2] = value & 0xFF;
            pixelData[i * 4 + 3] = 255;
        }

        const imageData2 = new ImageData(pixelData, canvas.width, canvas.height);

        canvas.width = spriteCanv.width;
        canvas.height = spriteCanv.height;
        ctx.putImageData(imageData2, 0, 0);
        canvas.style.width = '200px';
        canvas.style.imageRendering = 'pixelated';


    }, [environment.currentSprite, angle]);
    return <>
       <canvas ref={canvasRef} />
       <input className="slider" type="range" min="0" step="0.01" max="6.5" value={angle} onChange={e => setAngle(e.target.value)} />
    </>
}
