import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';

@observer
export class ActiveSelection extends Component {

    render() {
        const { activeTiles } = environment;
        const { remainder, itemsPerRow, baseIndex, itemQty } = this.props;
        const baseSize = 32;

        return <svg
            width="100%"
            height="100%"
            className="active-selection"
        >
            {activeTiles.map((index) => {
                const x = remainder + (index % itemsPerRow) * baseSize;
                const y = (0|(index / itemsPerRow)) * baseSize;
                const shouldRender = index >= baseIndex && index < baseIndex + itemQty;

                return shouldRender && (
                    <rect
                        key={index}
                        x={x}
                        y={y}
                        width={baseSize}
                        height={baseSize}
                        fill="purple"
                        opacity="0.5"
                    />
                );
            })}
        </svg>;
    }

}
