import React from 'react';
import { environment } from '~/store/environment';
import { mappingState } from '~/components/mappings/state';
import { observer } from 'mobx-react';

export const Tile = observer(
    ({ data = [], paletteLine = 0, scale = 4, ...otherProps }) => {
        const { palettes, config } = environment;
        const { transparency, artPaletteLine } = config;
        paletteLine = (paletteLine + artPaletteLine) % 4;

        const gs = mappingState.globalScale;
        // spread covers sub-pixel rounding gaps between box-shadow 'pixels'
        const spread = gs % 1 !== 0 ? ` 0 ${(0.7 / gs).toFixed(2)}px` : '';

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
                                }px${spread} ${color}`;
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
