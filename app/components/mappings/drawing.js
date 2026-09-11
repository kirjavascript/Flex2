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
    const surface = createDrawingSurface(mappings, buffer);
    const color = getColor(buttons);
    const tool = drawingTools[drawTool];
    activeDrawing = { point, startPoint: point, color, surface, tool, width: drawWidth };
    mappingState.drawingPreview = { point, startPoint: point, color, tool: drawTool, width: drawWidth };
    tool.start(point, color, surface, drawWidth);
}

export function drawEnd() {
    if (activeDrawing) {
        const { point, color, surface, tool, startPoint, width } = activeDrawing;
        tool.end(point, color, surface, startPoint, width);
    }
    activeDrawing = undefined;
    mappingState.drawingPreview = undefined;
    setDrawing(false);
}

export function draw(node) {
    if (!activeDrawing) return;

    const point = getPoint(node);
    const { point: previousPoint, color, surface, tool, width } = activeDrawing;
    tool.move(point, color, surface, previousPoint, activeDrawing.startPoint, width);
    activeDrawing.point = point;
    mappingState.drawingPreview = {
        ...mappingState.drawingPreview,
        point,
    };
}
