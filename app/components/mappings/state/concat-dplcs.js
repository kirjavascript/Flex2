// anything over the format's own limit is split when writing, see
// normaliseDPLCs in run-script

export const isEmpty = (metadata) => !metadata || !Object.keys(metadata).length;

// adjacent tiles share an entry unless both carry metadata and it differs
export function compatible(a, b) {
    if (isEmpty(a) || isEmpty(b)) return true;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length
        && keys.every((key) => a[key] === b[key]);
}

// without matchMetadata, a merged entry keeps the metadata of its first tile
export function concatDPLCs(dplcs, { maxSize = Infinity, matchMetadata = true } = {}) {
    const newDPLCs = [];
    let obj;

    dplcs.forEach(({ art, size, metadata }) => {
        for (let i = 0; i < size; i++) {
            const num = art + i;
            if (
                obj
                && obj.size < maxSize
                && obj.art + obj.size === num
                && (!matchMetadata || compatible(obj.metadata, metadata))
            ) {
                obj.size++;
                if (matchMetadata && isEmpty(obj.metadata) && !isEmpty(metadata)) {
                    obj.metadata = { ...metadata };
                }
            } else {
                if (obj) newDPLCs.push(obj);
                obj = { art: num, size: 1 };
                if (metadata) obj.metadata = { ...metadata };
            }
        }
    });

    if (obj) newDPLCs.push(obj);

    return newDPLCs;
}
