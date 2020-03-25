let distance = 1;

document.addEventListener('keydown', (e) => {
    if (e.key == 'Shift') {
        distance = 8;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key == 'Shift') {
        distance = 1;
    }
});

export const getDistance = () => {
    return distance;
};
