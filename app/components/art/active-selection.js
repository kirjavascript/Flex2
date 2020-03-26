import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { magenta } from '!!sass-variables-loader!#styles/variables.scss';
import { uuid } from '#util/uuid';

@observer
export class ActiveSelection extends Component {

    id = uuid();

    render() {
        return <svg
            width="100%"
            height="100%"
            className="active-selection"
        >
            <defs>
                <SelectionLayer
                    id={this.id}
                    {...this.props}
                />
            </defs>
            <mask id={`${this.id}-mask`}>
                <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                <use xlinkHref={`#${this.id}`} fill="black" />
            </mask>
            <SelectionLayer
                mask={`url(#${this.id}-mask)`}
                {...this.props}
                offset={1}
                color={magenta}
            />
        </svg>;
    }

}

@observer
class SelectionLayer extends Component {

    render() {
        const { activeTiles } = environment;
        const {
            remainder,
            itemsPerRow,
            baseIndex,
            itemQty,
            offset = 0,
            color = null,
            ...otherProps
        } = this.props;

        const baseSize = 32;
        const marginTop = -5; // to handle overflow

        return <g {...otherProps}>
            {activeTiles.map((index) => {
                const x = remainder + (index % itemsPerRow) * baseSize;
                const y = (0|(index / itemsPerRow)) * baseSize;
                const shouldRender = index >= baseIndex && index < baseIndex + itemQty;

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
}
