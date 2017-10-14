import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import { importState } from './state';
import { Item, Select, Input } from '#ui';
import { fuzzyAssert, zoomAssert } from '#util/assertions';

@observer
class Importer extends React.Component {

    render() {
        const { config: { active }, bboxes, scale } = importState;

        return active && <div className="importer">

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
                        <div>
                            <Item
                                color="blue"
                                inverted
                                onClick={importState.getBBoxes}
                            >
                                Import {bboxes.length} Sprites
                            </Item>

                        </div>
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
                    />
                    {bboxes.map((bbox, i) => (
                        <div
                            key={i}
                            className="bbox"
                            style={{
                                left: bbox.x,
                                top: bbox.y,
                                width: bbox.width + 1,
                                height: bbox.height + 1,
                            }}
                        />
   ))}
                </div>
            </div>
        </div>;
    }
}

render(
    <Importer/>,
    document.body.appendChild(document.createElement('div')),
);
