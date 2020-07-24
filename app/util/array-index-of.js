export function arrayIndexOf(needle, haystack) {
    const existingIndices = needle.map((d) => haystack.indexOf(d));
    if (
        existingIndices.length && // check all tiles are defined
        !existingIndices.some((d) => d == -1) && // tiles exist in new list
            existingIndices
                .every((d, i) => (
                    i === existingIndices.length - 1 ||
                    d < existingIndices[i + 1]
                )) // and are all sequential
        ) {
        return existingIndices[0];
    }
    else {
        return -1;
    }
}
