import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';

@observer
export class Tile extends Component {

    render() {
        const { data, paletteLine, scale = 4 } = this.props;
        const { palettesWeb, config } = environment;
        const { transparency } = config;

        return (
            <div
                style={{
                    width: 8 * scale,
                    height: 8 * scale,
                }}
            >
                <div style={{
                    width: scale,
                    height: scale,
                    marginLeft: -scale,
                    marginTop: -scale,
                    boxShadow: data.map((pixel, i) => {
                        const color = do {
                            if (pixel == 0 && transparency) {
                                'transparent';
                            }
                            else {
                                palettesWeb[paletteLine][pixel];
                            }
                        };
                        return `${((i%8)+1)*scale}px ${((0|i/8)+1)*scale}px ${color}`;
                    }).join`,`,
                }}/>
            </div>
        );
    }

}
