import React, { useRef, useEffect } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';

export const Tile = observer(
    ({ data = [], paletteLine = 0, scale = 4, ...otherProps }) => {
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
                <div
                    style={{
                        width: scale + 'px',
                        height: scale + 'px',
                        marginLeft: -scale,
                        marginTop: -scale,
                        boxShadow:
                            data &&
                            data.map((pixel, i) => {
                                const color =
                                    pixel == 0 && transparency
                                        ? 'transparent'
                                        : palettes[paletteLine][pixel];
                                return `${((i % 8) + 1) * scale}px ${
                                    ((0 | (i / 8)) + 1) * scale
                                }px ${color}`;
                            }).join`,`,
                    }}
                />
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
    },
);
