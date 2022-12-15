import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';
import { Select, Input } from '#ui';

export const PaletteHUD = observer(
    class PaletteHUD extends Component {
        render() {
            const { palettes } = environment;
            const { drawIndexLeft, drawIndexRight, drawPalette } = mappingState;
            const palette = ['erase', ...palettes[drawPalette].slice(1)];
            return (
                <div className="hud">
                    <Select
                        key={`left-${drawPalette}`}
                        options={palette.map((color, i) => ({
                            value: i,
                            label: color,
                        }))}
                        label="left"
                        store={mappingState}
                        accessor="drawIndexLeft"
                        color
                    />
                    <Select
                        key={`right-${drawPalette}`}
                        options={palette.map((color, i) => ({
                            value: i,
                            label: color,
                        }))}
                        label="right"
                        store={mappingState}
                        accessor="drawIndexRight"
                        color
                    />
                    <Select
                        options={[0, 1, 2, 3]}
                        label="line"
                        store={mappingState}
                        accessor="drawPalette"
                        flipScroll
                    />
                </div>
            );
        }
    },
);
