import React, { Component } from 'react';
import { Tile } from '../art/tile';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';

@observer
export class Mapping extends Component {

    render() {
        const { data, tileBuffer } = this.props;
        const { top, left, width, height, art, palette, vflip, hflip } = data;
        const { tileBuffers } = environment;
        const scale = 4;

        return <div
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
                    const index = art + tileIndex;
                    const tile = tileBuffer
                        && (tileBuffer.length > index)
                        && tileBuffer[art + tileIndex];

                    return !!tile && <Tile
                        key={tileIndex}
                        data={tile}
                        paletteLine={palette}
                        scale={scale}
                    />;
                })}
        </div>;
    }

}
