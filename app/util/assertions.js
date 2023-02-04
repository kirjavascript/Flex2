import clamp from 'lodash/clamp';

export const isNumber = (num) => {
    const value = parseInt(num, 10);
    return Number.isNaN(value) ? 0 : value;
};

export const isPositiveNumber = (num) => {
    return Math.max(0, isNumber(num));
};

export const isDPLCSize = (num) => {
    return clamp(isPositiveNumber(num), 1, 256);
};

export const isWidthHeight = (num) => {
    return clamp(isPositiveNumber(num), 1, 4);
};

export const fuzzyAssert = (num) => {
    return clamp(isPositiveNumber(num), 0, 32);
};

export const zoomAssert = (num) => {
    return clamp(isPositiveNumber(num), 1, 20);
};

export const paletteLineAssert = (num) => {
    return clamp(isPositiveNumber(num), 0, 3);
};
