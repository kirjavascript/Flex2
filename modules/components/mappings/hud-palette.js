import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';
import { Select } from '#ui/select';

@observer
export class PaletteHUD extends Component {

    render() {
        const { palettes } = environment;
        const { drawIndex, drawPalette } = mappingState;
        const palette = palettes[drawPalette].slice(1);
        return <div className="hud">
            <Select
                key={drawPalette}
                options={palette.map((color, i) => ({
                    value: i+1,
                    label: color,
                }))}
                label="colour"
                store={mappingState}
                accessor="drawIndex"
                color
            />
            <Select
                options={[0, 1, 2, 3]}
                label="line"
                store={mappingState}
                accessor="drawPalette"
            />
        </div>;
    }

}
