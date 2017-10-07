import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';

@observer
export class Tile extends Component {

    render() {
        const { data, paletteLine = 0, scale = 4, ...otherProps } = this.props;
        const { palettes, config } = environment;
        const { transparency } = config;

        return (
            <div
                style={{
                    width: 8 * scale,
                    height: 8 * scale,
                }}
                {...otherProps}
            >
                <div style={{
                    width: scale + 'px',
                    height: scale + 'px',
                    marginLeft: -scale,
                    marginTop: -scale,
                    boxShadow: data && data.map((pixel, i) => {
                        const color = do {
                            if (pixel == 0 && transparency) {
                                'transparent';
                            }
                            else {
                                palettes[paletteLine][pixel];
                            }
                        };
                        return `${((i%8)+1)*scale}px ${((0|i/8)+1)*scale}px ${color}`;
                    }).join`,`,
                }}/>
                {!data.length && (
                    <div
                        style={{
                            width: 8 * scale,
                            height: 8 * scale,
                        }}
                        className="tile-nodata"
                    />
                )}
            </div>
        );
    }

}
