import { observable, action, makeObservable } from 'mobx';

const STORAGE_KEY = 'selectedObject';

function findByName(objects, name) {
    if (!objects) return;
    for (let i = 0; i < objects.length; i++) {
        if (!objects[i].isDirectory && objects[i].name === name) return objects[i];
        if (objects[i].children) {
            const result = findByName(objects[i].children, name);
            if (result) return result;
        }
    }
}

class Selection {
    ref = null;
    name = localStorage.getItem(STORAGE_KEY);

    constructor() {
        makeObservable(this, {
            ref: observable.ref,
            name: observable,
            select: action,
            clear: action,
        });
    }

    resolve(objects) {
        if (this.ref) return this.ref;
        if (!this.name) return;
        const obj = findByName(objects, this.name);
        if (obj) this.ref = obj;
        return obj;
    }

    select(obj) {
        this.ref = obj;
        this.name = obj.name;
        localStorage.setItem(STORAGE_KEY, obj.name);
    }

    clear() {
        this.ref = null;
        this.name = null;
        localStorage.removeItem(STORAGE_KEY);
    }
}

export const selection = new Selection();
