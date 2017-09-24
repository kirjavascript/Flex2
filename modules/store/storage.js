import { toJS } from 'mobx';

let saveData = true;

export function storage(obj, name) {

    let saved = localStorage.getItem(name);

    if (saved != null) {
        try {
            saved = JSON.parse(saved);

            Object
                .keys(saved)
                .forEach((prop) => {
                    if (Array.isArray(saved[prop])) {
                        obj[prop].replace(saved[prop]);
                    }
                    else if (typeof saved[prop] == 'object' && saved[prop]) {
                        Object.assign(obj[prop], saved[prop]);
                    }
                    else {
                        obj[prop] = saved[prop];
                    }
                });
        }
        catch(e) {
            console.error(`Error parsing localStorage JSON data: ${e}`);
        }
    }

    window.addEventListener('beforeunload', () => {
        if (saveData) {
            localStorage.setItem(name, JSON.stringify(obj));
        }
    });

}

window.__clearStorage = () => {
    while(localStorage.key(0)) {
        localStorage.removeItem(localStorage.key(0));
    }
    saveData = false;
    location.reload();
};
