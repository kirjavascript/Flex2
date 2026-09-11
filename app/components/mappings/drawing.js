// called from drag-move

import { LEFT, RIGHT } from './buttons';
import { event, mouse } from 'd3-selection';
import { mappingState } from './state';
import { environment } from '~/store/environment';
import { setDrawing } from '~/store/history';
import { createDrawingSurface } from './drawing-surface';
import { drawingTools } from './drawing-tools';

let activeDrawing;

function getPoint(node) {
    const [xPos, yPos] = mouse(node);
    return {
        x: Math.floor((xPos - mappingState.x) / mappingState.scale),
        y: Math.floor((yPos - mappingState.y) / mappingState.scale),
    };
}

function getColor(buttons) {
    return buttons === LEFT ? mappingState.drawIndexLeft : mappingState.drawIndexRight;
}

export function drawStart(node) {
    setDrawing(true);
    const { sourceEvent: { buttons } } = event;
    const { mode, drawTool, drawWidth } = mappingState;
    const { currentSprite: { mappings, buffer } } = environment;

    if (mode !== 'drawing' || !mappings.length || (buttons !== LEFT && buttons !== RIGHT)) return;

    const point = getPoint(node);
    const color = getColor(buttons);
    const tool = drawingTools[drawTool];
    const surface = createDrawingSurface(mappings, buffer);
    activeDrawing = { point, startPoint: point, color, surface, tool, width: drawWidth };
    if (tool.live) surface.snapshot();
    if (tool.start) tool.start(point, color, surface, drawWidth);
}

export function drawEnd() {
    if (activeDrawing) {
        const { point, color, surface, tool, startPoint, width } = activeDrawing;
        // a live tool's last preview is not necessarily at the release point:
        // reset to the snapshot, then commit the final shape
        surface.restore();
        if (tool.end) tool.end(point, color, surface, startPoint, width);
    }
    activeDrawing = undefined;
    setDrawing(false);
}

export function draw(node) {
    if (!activeDrawing) return;

    const point = getPoint(node);
    const { point: previousPoint, color, surface, tool, width, startPoint } = activeDrawing;

    if (tool.live) {
        // preview into the real tiles: clean up the last frame, redraw the
        // shape at the cursor
        surface.restore();
        tool.end(point, color, surface, startPoint, width);
    } else if (tool.move) {
        tool.move(point, color, surface, previousPoint, startPoint, width);
    }

    activeDrawing.point = point;
}
