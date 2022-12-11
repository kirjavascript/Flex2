import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import { importState } from './state';
import { Item, Select, Input } from '#ui';
import { fuzzyAssert, zoomAssert } from '#util/assertions';

export const DetectSprites = observer(class DetectSprites extends React.Component {

    render() {
        const { bboxes, scale } = importState;

        return <div className="importer">

            <div className="menu">

                <div className="menu-section">
                    <Item
                        color="green"
                        inverted
                        onClick={importState.getBBoxes}
                    >
                        Detect Sprites
                    </Item>

                    {!!bboxes.length && (
                        <Item
                            color="blue"
                            inverted
                            onClick={importState.importSprites}
                        >
                            Import {bboxes.length} Sprites
                        </Item>
                    )}

                    <div className="input">
                        <span>Fuzziness</span>
                        <Input
                            store={importState}
                            accessor="fuzziness"
                            assert={fuzzyAssert}
                            isNumber
                        />
                    </div>

                    <div className="input">
                        <span>Zoom</span>
                        <Input
                            store={importState}
                            accessor="scale"
                            assert={zoomAssert}
                            isNumber
                        />
                    </div>

                </div>

                <div className="menu-section">
                    <Item
                        color="red"
                        inverted
                        onClick={importState.cancel}
                    >
                        Cancel
                    </Item>
                </div>

            </div>


            <div className="container">
                <div className="workspace" style={{transform: `scale(${scale})`}}>
                    <canvas
                        ref={importState.canvasRef}
                        className="detect-canvas"
                    />
                    {bboxes.map((bbox, i) => (
                        <div
                            key={i}
                            className="bbox"
                            style={{
                                left: bbox.x,
                                top: bbox.y,
                                width: bbox.width,
                                height: bbox.height,
                            }}
                        >
                    </div>
   ))}
                </div>
            </div>
        </div>;
    }
});
