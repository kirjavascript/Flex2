import React from 'react';
import { render } from 'react-dom';
import { observer } from 'mobx-react';
import { importState } from './state';
import { Item, Select, Input } from '#ui';
import { zoomAssert, paletteLineAssert } from '#util/assertions';

export const ImportSprites = observer(class ImportSprites extends React.Component {

    render() {
        const { scale, sprites, spriteIndex, mappings, importWidth, importHeight } = importState;

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
                        color="magenta"
                        inverted
                        onClick={importState.importAll}
                    >
                        Import All
                    </Item>
                    <Item
                        color="yellow"
                        inverted
                        onClick={importState.next}
                    >
                        Next Sprite
                    </Item>
                    <Item
                        color="yellow"
                        inverted
                        onClick={importState.prev}
                    >
                        Prev Sprite
                    </Item>

                    <Select
                        options={[
                            {label: 'Reduce Mappings', value: 'mappings'},
                            {label: 'Reduce Tiles', value: 'tiles'},
                        ]}
                        store={importState}
                        accessor="type"
                        onChange={importState.changeType}
                    />

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

                    <div className="input">
                        <span>Mappings</span>
                        <span>{mappings.length}</span>
                    </div>

                    <div className="input">
                        <span>Tiles</span>
                        <span>{importState.tileQty}</span>
                    </div>

                    <div className="input">
                        <span>Sprite</span>
                        <span>{spriteIndex+1} / {sprites.length}</span>
                    </div>

                </div>

                <div className="menu-section">
                    <Item
                        color="orange"
                        inverted
                        onClick={importState.backToDetect}
                    >
                        Back
                    </Item>
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
                        width: 0,
                        height: 0,
                        left: '50%',
                        top: '50%',
                        transform: `
                            scale(${scale})
                            translate(-${importWidth/2}px,-${importHeight/2}px)
                        `,
                    }}>
                    <canvas
                        key={`import-${spriteIndex}`}
                        ref={importState.canvasRefImport}
                        className="import-canvas"
                    />
                    {mappings.map(({x, y, width, height}, i) => (
                        <div
                            style={{
                                top: y,
                                left: x,
                                width: (8*width)-1,
                                height: (8*height)-1,
                            }}
                            key={i}
                            className="import-mapping"
                        />
                    ))}
                </div>
            </div>
        </div>;
    }
});
