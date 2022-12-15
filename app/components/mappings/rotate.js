import React, { useEffect, useRef } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { exportSprite } from '#formats/image';
import { rotateImageData } from '#util/rotsprite';
import { Input, Slider, Item, Button, Modal } from '#ui';
import { mappingState } from './state';

import { importState } from '../import/state';

function rotateCurrentSprite(canvas, angle) {
    const spriteCanv = exportSprite(environment.currentSprite);
    const spriteCtx = spriteCanv.getContext('2d');
    const { width, height } = spriteCanv;
    const imageData = spriteCtx.getImageData(0, 0, width, height);
    const rotatedData = rotateImageData(imageData, angle, width, height);

    const ctx = canvas.getContext('2d');
    canvas.width = rotatedData.width;
    canvas.height = rotatedData.height;
    ctx.putImageData(rotatedData, 0, 0);
}

export const Rotate = observer(() => {
    const canvasRef = useRef();

    const { active, angle } = mappingState.rotate;

    useEffect(() => {
        if (!canvasRef.current) {
            requestAnimationFrame(() => {
                canvasRef.current &&
                    rotateCurrentSprite(canvasRef.current, angle);
            });
            return;
        }
        rotateCurrentSprite(canvasRef.current, angle);
    }, [environment.currentSprite, angle, active]);

    const assertInput = (num) => {
        const value = Math.max(0, Math.min(360, num));
        if (Number.isNaN(value)) return 0;
        return value;
    };

    function reImport() {
        importState.rotCanvas = canvasRef.current;
        importState.config.active = true;
    }

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
                <Button color="red" onClick={reImport}>Reimport</Button>
            </div>
        </Modal>
    );
});
