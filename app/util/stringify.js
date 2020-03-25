// taken from somewhere on stackoverflow
export function stringify(obj) {
    let cache = [];
    const out = JSON.stringify(obj, function(key, value) {
        if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
                // Circular reference found, discard key
                return;
            }
            // Store value in our collection
            cache.push(value);
        }
        return value;
    }, 4);
    cache = null; // Enable garbage collection

    return out;
}
