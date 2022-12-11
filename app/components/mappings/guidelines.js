import React, { Component } from 'react';
import { mappingState } from './state';
import { observer } from 'mobx-react';
import { select, event, mouse } from 'd3-selection';
import { drag } from 'd3-drag';

export const Guidelines = observer(class Guidelines extends Component {

    onRefY = (node) => {
        if (node) {
            select(node)
                .call(
                    drag()
                        .filter(() => true)
                        .on('drag', () => {
                            const { dy } = event;
                            const { guidelines } = mappingState;
                            guidelines.y += dy;
                            document.body.style.cursor = 'ns-resize';
                        })
                        .on('end', () => {
                            document.body.style.cursor = null;
                        })
                );
        }
    };

    onRefX = (node) => {
        if (node) {
            select(node)
                .call(
                    drag()
                        .filter(() => true)
                        .on('drag', () => {
                            const { dx, dy } = event;
                            const { guidelines } = mappingState;
                            guidelines.x += dx;
                            document.body.style.cursor = 'ew-resize';
                        })
                        .on('end', () => {
                            document.body.style.cursor = null;
                        })
                );
        }
    };

    render() {
        const { guidelinesAbs: { x, y }, guidelines: { enabled } } = mappingState;

        return enabled && <div className="guidelines">
            <div
                className="x"
                style={{
                    left: x,
                }}
                ref={this.onRefX}
            />
            <div
                className="y"
                style={{
                    top: y,
                }}
                ref={this.onRefY}
            />
        </div>;
    }

});
