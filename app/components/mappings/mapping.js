import React, { Component } from 'react';
import { Tile } from '../art/tile';
import { observer } from 'mobx-react';

@observer
export class Mapping extends Component {

    onRef = (node) => {
        if (node && this.props.wrapRef) {
            this.props.wrapRef(node);
        }
    }

    render() {
        const { wrapRef, data, tileBuffer, scale = 4, ...otherProps } = this.props;
        const { top, left, width, height, art, palette, vflip, hflip } = data;

        return <div
            ref={this.onRef}
            className="mapping"
            style={{
                top: top * scale,
                left: left * scale,
                width: width * scale * 8,
                height: height * scale * 8,
                transform: `scale(${hflip?-1:1},${vflip?-1:1})`,
            }}
            {...otherProps}
        >
            {Array.from({length: width * height})
                .map((_, tileIndex) => {
                    const index = art + tileIndex;
                    const tile = tileBuffer
                        && (tileBuffer.length > index)
                        && tileBuffer[art + tileIndex];

                    return <Tile
                        key={tileIndex}
                        data={tile}
                        paletteLine={palette}
                        scale={scale}
                    />;
                })}
        </div>;
    }

}
