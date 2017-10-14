import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import { importState } from './state';
import { Item, Select, Input } from '#ui';
import { zoomAssert, paletteLineAssert } from '#util/assertions';

@observer
export class ImportSprites extends React.Component {

    render() {
        const { scale, sprites, spriteIndex } = importState;

        return <div className="importer">

            <div className="menu">

                <div className="menu-section">
                    <Item
                        color="blue"
                        inverted
                        onClick={importState.importOne}
                    >
                        Import Sprite
                    </Item>
                    <Item
                        color="green"
                        inverted
                        onClick={importState.next}
                    >
                        Skip Sprite
                    </Item>
                    <Item
                        color="magenta"
                        inverted
                        onClick={importState.importAll}
                    >
                        Import All
                    </Item>

                    <div className="input">
                        <span>Palette</span>
                        <Input
                            store={importState}
                            accessor="paletteLine"
                            assert={paletteLineAssert}
                            onChange={importState.changePalette}
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

                    Sprite: {spriteIndex+1} / {sprites.length}

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
                <div
                    className="workspace"
                    style={{
                        transform: `scale(${scale})`,
                        width: `${100/scale}%`,
                        height: `${100/scale}%`,
                    }}>
                    <canvas
                        key={`import-${spriteIndex}`}
                        ref={importState.canvasRefImport}
                        style={{border: '1px solid red'}}
                        className="import-canvas"
                    />
                </div>
            </div>
        </div>;
    }
}
