let saveData = true;

// no keys = save everything

export function storage(obj, name, keys) {
    let saved = localStorage.getItem(name);

    if (saved != null) {
        try {
            saved = JSON.parse(saved);

            (keys || Object.keys(saved))
                .forEach((prop) => {
                    if (Array.isArray(saved[prop])) {
                        obj[prop].replace(saved[prop]);
                    } else if (typeof saved[prop] == 'object' && saved[prop]) {
                        Object.assign(obj[prop], saved[prop]);
                    } else {
                        obj[prop] = saved[prop];
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
