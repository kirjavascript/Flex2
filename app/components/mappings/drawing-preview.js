import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '~/store/environment';
import { mappingState } from './state';

export const DrawingPreview = observer(class DrawingPreview extends Component {
    render() {
        const { drawingPreview, scale, x, y } = mappingState;
        if (!drawingPreview || !['line', 'rectangle', 'ellipse'].includes(drawingPreview.tool)) {
            return null;
        }

        const { startPoint, point, color, width, tool } = drawingPreview;
        const stroke = environment.palettes[mappingState.drawPalette][color] || 'transparent';
        const x0 = x + ((startPoint.x + 0.5) * scale);
        const y0 = y + ((startPoint.y + 0.5) * scale);
        const x1 = x + ((point.x + 0.5) * scale);
        const y1 = y + ((point.y + 0.5) * scale);
        const shared = {
            fill: 'none',
            stroke,
            strokeWidth: width * scale,
            opacity: 0.75,
            pointerEvents: 'none',
        };

        if (tool === 'line' || x0 === x1 || y0 === y1) {
            return <line x1={x0} y1={y0} x2={x1} y2={y1} {...shared} />;
        }

        if (tool === 'rectangle') {
            return <rect
                x={Math.min(x0, x1)}
                y={Math.min(y0, y1)}
                width={Math.abs(x1 - x0)}
                height={Math.abs(y1 - y0)}
                {...shared}
            />;
        }

        return <ellipse
            cx={(x0 + x1) / 2}
            cy={(y0 + y1) / 2}
            rx={Math.abs(x1 - x0) / 2}
            ry={Math.abs(y1 - y0) / 2}
            {...shared}
        />;
    }
});
