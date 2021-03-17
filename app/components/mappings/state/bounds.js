
export function getBounds(mappings) {
    let minX = mappings[0].left;
    let maxX = mappings[0].left + mappings[0].width * 8;
    let minY = mappings[0].top;
    let maxY = mappings[0].top + mappings[0].height * 8;

    mappings.slice(1).forEach(({ top, left, width, height }) => {
        minX = Math.min(left, minX);
        minY = Math.min(top, minY);
        maxX = Math.max(left + width * 8, maxX);
        maxY = Math.max(top + height * 8, maxY);
    });

    return { minX, maxX, minY, maxY };
}

export function getCenter(mappings) {
    const { minX, maxX, minY, maxY } = getBounds(mappings);

    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
    };
}
