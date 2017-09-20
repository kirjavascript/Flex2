import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { mappingState } from './state';
import { uuid } from '#util/uuid';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';

@observer
export class Selection extends Component {

    constructor(props) {
        super(props);
        this.id = uuid();
    }

    render() {
        const { color = 'blue', opacity = 0, offset = 0, width = 6 } = this.props;
        const { x, y } = mappingState;

        return <g>
                <defs>
                    <SelectionLayer
                        id={this.id}
                        extra={offset}
                        color={null}
                        opacity={1 - opacity}
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
                />
        </g>;
    }

}

@observer
class SelectionLayer extends Component {
    render() {
        const { extra, color, opacity, ...otherProps } = this.props;
        const { buffer, index, mappings } = environment.currentSprite;
        const { scale, baseSize, x, y } = mappingState;

        return <g {...otherProps}>
            {mappings.map(({left, top, width, height}, mappingIndex) => {
                const baseWidth = width * scale * 8;
                const baseHeight = height * scale * 8;
                const rx = (left * scale) + (baseSize / 2) - (extra / 2);
                const ry = (top * scale) + (baseSize / 2) - (extra / 2);

                return (
                    <rect
                        key={mappingIndex}
                        x={rx + x}
                        y={ry + y}
                        width={baseWidth + extra}
                        height={baseHeight + extra}
                        fill={SVARS[color]}
                        opacity={opacity}
                    />
                );
            })}
        </g>;
    }
}
