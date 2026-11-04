import { workspace } from '~/store/workspace';
import { toast } from '~/components/toast';
import { createObjectIO } from './object-io';

/*
 * THIS STATE EXISTS FOR ONE THING ONLY: the "Load/Save Last Used Object"
 * commands (mod+l / mod+s). NOTHING ELSE IN THE EDITOR MAY READ IT.
 *
 * Do not render it, branch on it, persist it, make it observable, or add a
 * getter "just for this one case". The editor has no concept of a current
 * object and must keep working exactly the same if this file is deleted.
 * If you think you need to know which object is loaded, you are wrong: pass
 * the object you are working with explicitly.
 *
 * The export is a proxy that throws on anything except the three functions
 * below, so poking around for the stored object fails loudly.
 */

let last;

const reachable = (objects, obj) => objects.some((node) => (
    node === obj || (node.children && reachable(node.children, obj))
));

// a project object can be deleted or its project closed after it was used
const usable = () => last && (
    last === workspace.file
    || (workspace.project && reachable(workspace.project.objects, last))
);

const words = {
    load: ['Loading', 'Loaded'],
    save: ['Saving', 'Saved'],
};

const run = (verb, method) => async () => {
    if (!last) {
        toast(`Nothing to ${verb}: load or save an object first`);
        return;
    }
    if (!usable()) {
        last = undefined;
        toast(`Nothing to ${verb}: the last used object was removed or its project closed`);
        return;
    }

    const obj = last;
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
    remember: (obj) => { last = obj; },
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
