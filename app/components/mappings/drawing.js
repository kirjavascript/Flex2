// called from drag-move

import { LEFT, RIGHT, MIDDLE } from './buttons';
import { event, mouse } from 'd3-selection';
import { runInAction } from 'mobx';
import { mappingState } from './state';
import { environment } from '~/store/environment';
import { setDrawing } from '~/store/history';
import { createDrawingSurface } from './drawing-surface';
import { drawingTools } from './drawing-tools';

let activeDrawing;
let eyedropSurface;

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

    if (mode !== 'drawing' || !mappings.length
        || (buttons !== LEFT && buttons !== RIGHT && buttons !== MIDDLE)) return;

    const point = getPoint(node);

    // middle button: eyedropper. samples the pixel under the cursor into the
    // left (primary) color, and keeps sampling while held so you can scrub
    if (buttons === MIDDLE) {
        eyedropSurface = createDrawingSurface(mappings, buffer);
        eyedrop(node);
        return;
    }

    const color = getColor(buttons);
    const tool = drawingTools[drawTool];
    const surface = createDrawingSurface(mappings, buffer);
    activeDrawing = { point, startPoint: point, color, surface, tool, width: drawWidth };
    // one action per stroke event: every pixel write inside triggers its
    // reactions at the end, so tiles re-render once per frame instead of once
    // per changed pixel
    runInAction(() => {
        if (tool.live) surface.snapshot();
        if (tool.start) tool.start(point, color, surface, drawWidth);
    });
}

export function drawEnd() {
    if (activeDrawing) {
        const { point, color, surface, tool, startPoint, width } = activeDrawing;
        // a live tool's last preview is not necessarily at the release point:
        // reset to the snapshot, then commit the final shape
        runInAction(() => {
            surface.restore();
            if (tool.end) tool.end(point, color, surface, startPoint, width);
        });
    }
    activeDrawing = undefined;
    eyedropSurface = undefined;
    setDrawing(false);
}

function eyedrop(node) {
    const point = getPoint(node);
    const color = eyedropSurface.getPixel(point.x, point.y);
    // undefined = pressed in a gap between mappings: keep the current color
    if (color !== undefined) {
        mappingState.drawIndexLeft = color;
    }
}

export function draw(node) {
    if (eyedropSurface) {
        eyedrop(node);
        return;
    }
    if (!activeDrawing) return;

    const point = getPoint(node);
    const { point: previousPoint, color, surface, tool, width, startPoint } = activeDrawing;

    if (tool.live) {
        // preview into the real tiles: clean up the last frame, redraw the
        // shape at the cursor
        runInAction(() => {
            surface.restore();
            tool.end(point, color, surface, startPoint, width);
        });
    } else if (tool.move) {
        runInAction(() => {
            tool.move(point, color, surface, previousPoint, startPoint, width);
        });
    }

    activeDrawing.point = point;
}
