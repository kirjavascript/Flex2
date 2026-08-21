let saveData = true;

// no keys = save everything

export function storage(obj, name, keys) {
    let saved = localStorage.getItem(name);

    if (saved != null) {
        try {
            saved = JSON.parse(saved);

            // one stale key must not cost us the rest of the state: data saved
            // by an older version can name things that are gone, or are now
            // derived and have nowhere to be put back
            (keys || Object.keys(saved))
                .forEach((prop) => {
                    const value = saved[prop];
                    const current = obj[prop];

                    try {
                        if (Array.isArray(value)) {
                            if (current && typeof current.replace === 'function') {
                                current.replace(value);
                            }
                        } else if (typeof value == 'object' && value) {
                            if (current && typeof current == 'object') {
                                Object.assign(current, value);
                            }
                        } else {
                            obj[prop] = value;
                        }
                    } catch (e) {
                        console.error(`Could not restore '${name}.${prop}': ${e}`);
                    }
                });
        } catch(e) {
            console.error(`Error parsing localStorage JSON data: ${e}`);
        }
    }

    // save on close
    window.addEventListener('beforeunload', () => {
        if (saveData) {
            const toSave = keys
                ? keys.reduce((acc, key) => {
                    acc[key] = obj[key];
                    return acc;
                }, {})
                : obj;

            localStorage.setItem(name, JSON.stringify(toSave));
        }
    });
}

window.resetStorage = () => {
    while(localStorage.key(0)) {
        localStorage.removeItem(localStorage.key(0));
    }
    saveData = false;
    location.reload();
};
