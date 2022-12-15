import React, { useEffect, useRef } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { exportSprite } from '#formats/image';
import rotSprite, {
    Pixels,
    addMarginToImageData,
    getRotateDiagonal,
} from '#util/rotsprite';
import { Input, Slider, Item, Button, Modal } from '#ui';
import { mappingState } from './state';

export const Rotate = observer(() => {
    const canvasRef = useRef();

    useEffect(() => {
        if (!canvasRef.current) return;
        const spriteCanv = exportSprite(environment.currentSprite);
        const spriteCtx = spriteCanv.getContext('2d');

        const { width, height } = spriteCanv;

        const imageData = spriteCtx.getImageData(0, 0, width, height);

        const { diagonal, xMargin, yMargin } = getRotateDiagonal(width, height);

        const spriteData = addMarginToImageData(
            spriteCtx,
            imageData,
            xMargin,
            yMargin,
        );

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
            (mappingState.rotate.angle * Math.PI) / 180,
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
    }, [environment.currentSprite, mappingState.rotate.angle]);

    const assertInput = (num) => {
        const value = Math.max(0, Math.min(360, num));
        if (Number.isNaN(value)) return 0;
        return value;
    };

    const { active } = mappingState.rotate;

    return (
        <Modal
            className="rotsprite"
            spring={{
                top: active ? 15 : -100,
                opacity: active ? 1 : 0,
            }}
        >
            <Item>Rotate Sprite</Item>
            <canvas ref={canvasRef} />
            <div className="angles">
                <div className="numbers">
                    {Array.from({ length: 8 }, (_, i) => {
                        const angle = i * 45;
                        return (
                            <Button
                                key={i}
                                onClick={() => {
                                    mappingState.rotate.angle = angle;
                                }}
                            >
                                {angle}
                            </Button>
                        );
                    })}
                    <Input
                        store={mappingState.rotate}
                        assert={assertInput}
                        accessor="angle"
                        isNumber
                    />
                </div>

                    <Slider
                        min="0"
                        step="1"
                        max="360"
                        store={mappingState.rotate}
                        accessor="angle"
                    />
            </div>
            <div className="actions">
                <Button color="magenta" onClick={mappingState.toggleRotate}>
                    close
                </Button>
                <Button color="red">Reimport</Button>
            </div>
        </Modal>
    );
});
