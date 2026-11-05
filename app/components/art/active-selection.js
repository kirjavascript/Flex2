import React, { Component } from 'react';
import { environment } from '~/store/environment';
import { observer } from 'mobx-react';
import { magenta } from 'sass-variables';
import { id } from '~/util/uuid';

export const ActiveSelection = observer(class ActiveSelection extends Component {

    id = id();

    render() {
        const { totalHeight, ...props } = this.props;
        return <svg
            width="100%"
            height={totalHeight + 10}
            className="active-selection"
        >
            <defs>
                <SelectionLayer
                    id={this.id}
                    {...props}
                />
            </defs>
            <mask id={`${this.id}-mask`}>
                <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                <use xlinkHref={`#${this.id}`} fill="black" />
            </mask>
            <SelectionLayer
                mask={`url(#${this.id}-mask)`}
                {...props}
                offset={1}
                color={magenta}
            />
        </svg>;
    }

});

const SelectionLayer = observer(class SelectionLayer extends Component {

    render() {
        const { activeTiles } = environment;
        const {
            remainder,
            itemsPerRow,
            layout,
            scroll,
            height,
            offset = 0,
            color = null,
            ...otherProps
        } = this.props;

        const baseSize = 32;
        const marginTop = -5; // to handle overflow

        return <g {...otherProps}>
            {activeTiles.map((index) => {
                const owner = environment.bankAt(index);
                const entry = owner && layout.find(({ bank }) => bank === owner);
                if (!entry) return null;
                const i = index - owner.address;
                const x = remainder + (i % itemsPerRow) * baseSize;
                const y = entry.top + (0|(i / itemsPerRow)) * baseSize;
                const shouldRender = y > scroll - baseSize * 2
                    && y < scroll + height + baseSize * 2;

                return shouldRender && (
                    <rect
                        key={index}
                        x={0|(x- (offset*2))}
                        y={0|(y- (offset*2) - marginTop)}
                        width={baseSize + (offset*4)}
                        height={baseSize + (offset*4)}
                        fill={color}
                        opacity={1}
                    />
                );
            })}
        </g>;
    }
});
