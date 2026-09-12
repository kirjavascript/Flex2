import React, { Component } from 'react';
import { environment } from '~/store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';
import { Select, Input } from '~/ui';

export const PaletteHUD = observer(
    class PaletteHUD extends Component {
        render() {
            const { palettes } = environment;
            const { drawIndexLeft, drawIndexRight, drawPalette, drawTool, drawWidth, drawPoints } = mappingState;
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
                    <Select
                        key={`tool-${drawTool}`}
                        options={[
                            { value: 'pencil', label: 'pencil' },
                            { value: 'line', label: 'line' },
                            { value: 'fill', label: 'fill' },
                            { value: 'rectangle', label: 'rect' },
                            { value: 'ellipse', label: 'ellipse' },
                            { value: 'star', label: 'star' },
                        ]}
                        label="tool"
                        store={mappingState}
                        accessor="drawTool"
                    />
                    {drawTool == 'star' && (
                        <Select
                            key={`points-${drawPoints}`}
                            options={[3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                            label="points"
                            store={mappingState}
                            accessor="drawPoints"
                        />
                    )}
                    <Select
                        key={`width-${drawWidth}`}
                        options={[1, 2, 3, 4, 5, 6, 7, 8]}
                        label="width"
                        store={mappingState}
                        accessor="drawWidth"
                    />
                </div>
            );
        }
    },
);
