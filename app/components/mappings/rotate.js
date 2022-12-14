import React, { useEffect, useRef } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { exportSprite } from '#formats/image';
import rotSprite, { Pixels } from '#util/rotsprite';
import { Input, Slider, Item } from '#ui';
import { mappingState } from './state';

export const Rotate = observer(() => {
    const canvasRef = useRef();

    useEffect(() => {
        const spriteCanv = exportSprite(environment.currentSprite);
        const spriteCtx = spriteCanv.getContext('2d');

        const { width, height } = spriteCanv;
        spriteCtx.scale(2, 2)

        const imageData = spriteCtx.getImageData(0, 0, width, height);

        const diagonal =
            1 + (0 | (2 * Math.sqrt(width ** 2 / 4 + height ** 2 / 4)));

        const xMargin = (diagonal - width) / 2;
        const yMargin = (diagonal - height) / 2;

        spriteCanv.width = diagonal;
        spriteCanv.height = diagonal;
        spriteCtx.putImageData(imageData, xMargin, yMargin);

        const spriteData = spriteCtx.getImageData(0, 0, diagonal, diagonal);

        const data = new Uint32Array(diagonal ** 2);

        for (let i = 0; i < spriteData.data.length; i += 4) {
            const r = spriteData.data[i];
            const g = spriteData.data[i + 1];
            const b = spriteData.data[i + 2];
            const a = spriteData.data[i + 3];
            data[i / 4] = (a << 24) + (r << 16) + (g << 8) + b;
        }

        const rotated = rotSprite(
            new Pixels(diagonal, diagonal, data),
            (mappingState.rotateAngle * Math.PI) / 180,
        ).pixels;

        const pixelData = new Uint8ClampedArray(data.length * 4);

        for (let i = 0; i < data.length; i++) {
            const value = rotated[i];

            pixelData[i * 4] = (value >> 16) & 0xff;
            pixelData[i * 4 + 1] = (value >> 8) & 0xff;
            pixelData[i * 4 + 2] = value & 0xff;
            pixelData[i * 4 + 3] = (value >> 24) & 0xff;
        }

        const rotatedData = new ImageData(pixelData, diagonal, diagonal);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = diagonal;
        canvas.height = diagonal;
        ctx.putImageData(rotatedData, 0, 0);
        canvas.style.width = '400px';
        canvas.style.imageRendering = 'pixelated';
        canvas.style.backgroundColor = 'red';
    }, [environment.currentSprite, mappingState.rotateAngle]);

    const assertInput = (num) => {
        const value = Math.max(0, Math.min(360, num));
        if (Number.isNaN(value)) return 0;
        return value;
    };

    return (
        <div className="rotsprite">
            <Item>Rotate Sprite</Item>
            <canvas ref={canvasRef} />
            <Input
                store={mappingState}
                assert={assertInput}
                accessor="rotateAngle"
                isNumber
            />
            <Slider
                min="0"
                step="1"
                max="360"
                store={mappingState}
                accessor="rotateAngle"
            />
        </div>
    );
});
