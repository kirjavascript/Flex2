let count = 0;

export function uuid() {
    return (++count).toString(36);
}
