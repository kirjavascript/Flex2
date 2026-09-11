function drawPoint(surface, x, y, color, width, circular = false) {
    const before = Math.floor((width - 1) / 2);
    const after = width - before - 1;
    const radius = (width / 2) - 0.25;
    for (let offsetY = -before; offsetY <= after; offsetY++) {
        for (let offsetX = -before; offsetX <= after; offsetX++) {
            if (circular && Math.hypot(offsetX, offsetY) > radius) continue;
            surface.setPixel(x + offsetX, y + offsetY, color);
        }
    }
}

function drawLine(surface, x0, y0, x1, y1, color, width, circular = false) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    for (;;) {
        drawPoint(surface, x0, y0, color, width, circular);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

function drawRectangle(surface, x0, y0, x1, y1, color, width) {
    drawLine(surface, x0, y0, x1, y0, color, width);
    drawLine(surface, x1, y0, x1, y1, color, width);
    drawLine(surface, x1, y1, x0, y1, color, width);
    drawLine(surface, x0, y1, x0, y0, color, width);
}

function drawEllipse(surface, x0, y0, x1, y1, color, width) {
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    const top = Math.min(y0, y1);
    const bottom = Math.max(y0, y1);
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const radiusX = (right - left) / 2;
    const radiusY = (bottom - top) / 2;

    if (!radiusX || !radiusY) {
        drawLine(surface, x0, y0, x1, y1, color, width);
        return;
    }

    const steps = Math.ceil(2 * Math.PI * Math.max(radiusX, radiusY) * 2);
    for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * 2 * Math.PI;
        drawPoint(
            surface,
            Math.round(centerX + (Math.cos(angle) * radiusX)),
            Math.round(centerY + (Math.sin(angle) * radiusY)),
            color,
            width,
        );
    }
}

function floodFill(surface, x, y, color) {
    const target = surface.getPixel(x, y);
    if (target === undefined || target === color) return;

    const pending = [[x, y]];
    const seen = new Set();
    while (pending.length) {
        const [currentX, currentY] = pending.pop();
        const key = `${currentX},${currentY}`;
        if (seen.has(key) || surface.getPixel(currentX, currentY) !== target) continue;
        seen.add(key);
        surface.setPixel(currentX, currentY, color);
        pending.push(
            [currentX + 1, currentY],
            [currentX - 1, currentY],
            [currentX, currentY + 1],
            [currentX, currentY - 1],
        );
    }
}

// a live tool draws nothing until the stroke ends: its `end` shape is instead
// re-rendered straight into the tiles on every move, so the preview and the
// commit can never drift apart
export const drawingTools = {
    pencil: {
        start(point, color, surface, width) {
            drawPoint(surface, point.x, point.y, color, width, true);
        },
        move(point, color, surface, previousPoint, _startPoint, width) {
            drawLine(surface, previousPoint.x, previousPoint.y, point.x, point.y, color, width, true);
        },
    },
    line: {
        live: true,
        end(point, color, surface, startPoint, width) {
            drawLine(surface, startPoint.x, startPoint.y, point.x, point.y, color, width);
        },
    },
    fill: {
        start(point, color, surface) {
            floodFill(surface, point.x, point.y, color);
        },
    },
    rectangle: {
        live: true,
        end(point, color, surface, startPoint, width) {
            drawRectangle(surface, startPoint.x, startPoint.y, point.x, point.y, color, width);
        },
    },
    ellipse: {
        live: true,
        end(point, color, surface, startPoint, width) {
            drawEllipse(surface, startPoint.x, startPoint.y, point.x, point.y, color, width);
        },
    },
};
