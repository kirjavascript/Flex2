let count = 0;

export function id() {
    return (++count).toString(36);
}

var IDX=256, HEX=[], BUFFER;
while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);

// stolen from https://github.com/lukeed/uuid
export function uuid() {
    var i=0, num, out='';

    if (!BUFFER || ((IDX + 16) > 256)) {
        BUFFER = Array(i=256);
        while (i--) BUFFER[i] = 256 * Math.random() | 0;
        i = IDX = 0;
        }

    for (; i < 16; i++) {
        num = BUFFER[IDX + i];
        if (i==6) out += HEX[num & 15 | 64];
        else if (i==8) out += HEX[num & 63 | 128];
        else out += HEX[num];

        if (i & 1 && i > 1 && i < 11) out += '-';
        }

    IDX++;
    return out;
}
