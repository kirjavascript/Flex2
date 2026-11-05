import { workspace } from '~/store/workspace';
import { toast } from '~/components/toast';
import { savingStorage } from '~/store/storage';
import { createObjectIO } from './object-io';

/*
 * THIS STATE EXISTS FOR ONE THING ONLY: the "Load/Save Last Used Object"
 * commands (mod+l / mod+s). NOTHING ELSE IN THE EDITOR MAY READ IT.
 *
 * Do not render it, branch on it, make it observable, or add a getter "just
 * for this one case". It is persisted only so the commands survive a restart. The editor has no concept of a current
 * object and must keep working exactly the same if this file is deleted.
 * If you think you need to know which object is loaded, you are wrong: pass
 * the object you are working with explicitly.
 *
 * The export is a proxy that throws on anything except the three functions
 * below, so poking around for the stored object fails loudly.
 */

const STORAGE_KEY = 'last-object';

// live reference this session, descriptor from a previous one or a reopened project
let last;
let ref;

const indexPath = (objects, obj) => {
    for (let i = 0; i < objects.length; i++) {
        if (objects[i] === obj) return [i];
        const sub = objects[i].children && indexPath(objects[i].children, obj);
        if (sub) return [i, ...sub];
    }
};

const describe = (obj) => {
    if (obj === workspace.file) return { file: true };
    const path = workspace.project && indexPath(workspace.project.objects, obj);
    return path && { projectPath: workspace.projectPath, path, name: obj.name };
};

// the descriptor can be stale: deleted, moved, renamed, or from another project
const resolve = () => {
    if (last && describe(last)) return last;
    if (!ref) return;
    if (ref.file) return workspace.file;
    if (!workspace.project || ref.projectPath !== workspace.projectPath) return;
    let node = { children: workspace.project.objects };
    for (const i of ref.path) node = node.children?.[i];
    if (node && !node.isDirectory && node.name === ref.name) return node;
};

const stored = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
        return undefined;
    }
};

const persist = () => {
    if (ref) localStorage.setItem(STORAGE_KEY, JSON.stringify(ref));
    else localStorage.removeItem(STORAGE_KEY);
};

const remember = (obj) => {
    last = obj;
    ref = describe(obj);
    persist();
};

const forget = () => {
    last = ref = undefined;
    persist();
};

ref = stored();

// objects can be moved or renamed after use
window.addEventListener('beforeunload', () => {
    if (savingStorage() && last && describe(last)) {
        ref = describe(last);
        persist();
    }
});

const words = {
    load: ['Loading', 'Loaded'],
    save: ['Saving', 'Saved'],
};

const run = (verb, method) => async () => {
    if (!last && !ref) {
        toast(`Nothing to ${verb}: load or save an object first`);
        return;
    }
    const obj = resolve();
    if (!obj) {
        forget();
        toast(`Nothing to ${verb}: the last used object was removed or its project closed`);
        return;
    }
    last = obj;

    const name = obj === workspace.file ? 'File object' : obj.name;
    const [doing, done] = words[verb];
    const update = toast(`${doing} ${name}...`, 'pending');

    const errors = [];
    const collect = (section) => (error) => {
        if (error) errors.push(`${section}: ${error.message || String(error)}`);
    };
    const ran = await createObjectIO(obj, {
        setArtError: collect('Art'),
        setMappingError: collect('Mappings'),
        setPaletteError: collect('Palettes'),
    })[method]();

    if (!ran.some(Boolean)) {
        update(`Could not ${verb} ${name}: no game format, or its script has an error`, 'error');
    } else if (errors.length) {
        update(`Failed to ${verb} ${name}\n${errors.join('\n')}`, 'error');
    } else {
        update(`${done} ${name}`, 'success');
    }
};

export const lastObject = new Proxy(Object.freeze({
    remember,
    load: run('load', 'loadObject'),
    save: run('save', 'saveObject'),
}), {
    get(api, key) {
        if (!(key in api)) {
            throw new Error(
                `lastObject.${String(key)}: the last used object is private to the `
                + 'load/save last object commands, the editor must not read it',
            );
        }
        return api[key];
    },
});
