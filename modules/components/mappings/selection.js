import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';
import { uuid } from '#util/uuid';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';

@observer
export class Selection extends Component {

    id = uuid();

    render() {
        const { color = 'blue', opacity = 0, offset = 0, width = 6, all } = this.props;
        const { x, y } = mappingState;

        return <g>
                <defs>
                    <SelectionLayer
                        id={this.id}
                        extra={offset}
                        color={null}
                        opacity={1 - opacity}
                        all={all}
                    />
                </defs>
                <mask id={`${this.id}-mask`}>
                    <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                    <use xlinkHref={`#${this.id}`} fill="black" />
                </mask>
                <SelectionLayer
                    mask={`url(#${this.id}-mask)`}
                    extra={offset + width}
                    color={color}
                    opacity={1}
                    all={all}
                />
        </g>;
    }

}

@observer
class SelectionLayer extends Component {
    render() {
        const { extra, color, opacity, all, ...otherProps } = this.props;
        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, x, y } = mappingState;

        return <g {...otherProps}>
            {mappings.map(({left, top, width, height}, mappingIndex) => {
                const baseWidth = width * scale * 8;
                const baseHeight = height * scale * 8;
                const rx = (left * scale) - (extra / 2);
                const ry = (top * scale) - (extra / 2);

                return (
                    all || ~mappingState.selectedIndicies.indexOf(mappingIndex) ?
                    <rect
                        key={mappingIndex}
                        x={rx + x}
                        y={ry + y}
                        width={baseWidth + extra}
                        height={baseHeight + extra}
                        fill={SVARS[color]}
                        opacity={opacity}
                    /> : false
                );
            })}
        </g>;
    }
}
