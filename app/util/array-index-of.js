export function arrayIndexOf(needle, haystack) {
    const existingIndicies = needle.map((d) => haystack.indexOf(d));
    if (
        existingIndicies.length && // check all tiles are defined
        !existingIndicies.some((d) => d == -1) && // tiles exist in new list
            existingIndicies
                .every((d, i) => (
                    i === existingIndicies.length - 1 ||
                    d < existingIndicies[i + 1]
                )) // and are all sequential
        ) {
        return existingIndicies[0];
    }
    else {
        return -1;
    }
}
