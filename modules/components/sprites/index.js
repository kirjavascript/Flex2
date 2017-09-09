import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Tile } from '../art/tile';

@observer
export class Sprites extends Component {

    render() {
        const { mappings, tileBuffers, palettes } = environment;
        const scale = 4;

        return <div>
            <div>(import sheet here)</div>

            {mappings.map((mappingList, spriteIndex) => (
                <div key={spriteIndex} className="sprite">
                    <div className="index">
                        0x{spriteIndex.toString(16).toUpperCase()}
                    </div>
                    {mappingList.map((mapping, mappingIndex) => {
                        const { top, left, width, height, art, palette, vflip, hflip } = mapping;

                        return <div
                            key={mappingIndex}
                            className="mapping"
                            style={{
                                top: top * scale,
                                left: left * scale,
                                width: width * scale * 8,
                                height: height * scale * 8,
                                transform: `scale(${hflip?-1:1},${vflip?-1:1})`,
                            }}
                        >
                            {Array.from({length: width * height})
                                .map((_, tileIndex) => {
                                    const buffer = tileBuffers[spriteIndex];
                                    const index = art + tileIndex;
                                    const tile = buffer
                                        && (buffer.length > index)
                                        && buffer[art + tileIndex];

                                    return !!tile && <Tile
                                        key={tileIndex}
                                        data={tile}
                                        palette={palettes[palette]}
                                    />;
                                })}
                        </div>;
                    })}
                </div>
            ))};

        </div>;
    }

}
