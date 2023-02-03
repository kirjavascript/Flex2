import React, { useEffect, useRef } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { exportSprite } from '#formats/image';
import { rotsprite, threeShears } from '#util/rotsprite';
import { Input, Slider, Item, Button, Modal, Select } from '#ui';
import { mappingState } from './state';

import { importState } from '../import/state';

function rotateCurrentSprite(canvas, angle, algorithm) {
    const spriteCanv = exportSprite(environment.currentSprite);

    if (algorithm === 'rotsprite') {
        rotsprite(spriteCanv, canvas, angle);
    } else {
        threeShears(spriteCanv, canvas, angle);
    }
}

export const Rotate = observer(() => {
    const canvasRef = useRef();

    const { active, angle, algorithm } = mappingState.rotate;

    useEffect(() => {
        if (!canvasRef.current) {
            requestAnimationFrame(() => {
                canvasRef.current &&
                    rotateCurrentSprite(canvasRef.current, angle, algorithm);
            });
            return;
        }
        rotateCurrentSprite(canvasRef.current, angle, algorithm);
    }, [environment.currentSprite, angle, active, algorithm]);

    const assertInput = (num) => {
        const value = Math.max(0, Math.min(360, num));
        if (Number.isNaN(value)) return 0;
        return value;
    };

    function reImport() {
        importState.rotCanvas = canvasRef.current;
        importState.config.active = true;
        mappingState.rotate.active = false;
    }

    return (
        <Modal
            className="rotsprite"
            spring={{
                top: active ? 15 : -100,
                opacity: active ? 1 : 0,
            }}
        >
            <div className="row">
            <Item>Rotate Sprite</Item>
            <Select
                options={mappingState.rotateAlgOptions}
                store={mappingState.rotate}
                accessor="algorithm"
            />
        </div>
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
                    Close
                </Button>
                <Button color="red" onClick={reImport}>
                    Import
                </Button>
            </div>
        </Modal>
    );
});
