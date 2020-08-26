import fs from 'fs';
import { join, dirname, parse } from 'path';
import { errorMsg } from '#util/dialog';
import { uniq, debounce } from 'lodash';
import { observable } from 'mobx';

const scriptPaths = uniq([
    dirname(process.execPath),
    process.cwd(),
]).map(path => join(path, 'scripts'));

export const scriptDir = scriptPaths.find(path => (
    fs.existsSync(path) && fs.lstatSync(path).isDirectory()
));

const scripts = observable([]);

const { readdir } = fs.promises;

async function loadScripts() {
    try {
        const list = await readdir(scriptDir);
        scripts.replace(list.map(filename => ({
            value: filename,
            label: parse(filename).name,
        })));
    } catch (e) {
        console.error(e);
    }
}

if (!scriptDir) {
    errorMsg(`Script Error`, `Could not find 'scripts' directory for mapping definition files
Searched in;\n\t${scriptPaths.join('\n\t')}`);
} else {
    loadScripts();
    fs.watch(scriptDir, debounce(loadScripts, 100));
}

export default scripts;
