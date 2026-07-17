import * as Comlink from 'comlink';

const endStr = '__flex2__done__';

const errorList = [];

function assemble(code, { messages, filename }) {
    return new Promise((resolve, reject) => {
        self.Module = {
            locateFile: url => `../wasm/${url}`,
            arguments: ['-q', '-xx', '-U', '-L', '-t', '2', filename],
            print: (text) => {
                if (text === endStr) return handleResult(resolve, reject);
                console.log('asl: ' + text);
            },
            printErr: (text) => {
                errorList.push(text);
            },
            onAbort: console.error,
            preInit: () => {
                FS.writeFile('as.msg', messages.asmsg);
                FS.writeFile('cmdarg.msg', messages.cmdargmsg);
                FS.writeFile('ioerrs.msg', messages.ioerrsmsg);
                FS.writeFile(filename, code);
            },
        };
        importScripts('../wasm/asl.js');
    });
}

function handleResult(resolve, reject) {
    if (errorList.length) return reject({
        name: 'ASError',
        message: '\n\n' + errorList.join('\n')
    });

    const outputs = FS.readdir('/').filter(d => d.endsWith('.p'));

    if (!outputs.length) return reject(new Error('cannot find .p'));

    const [pFilePath] = outputs;
    const binary = FS.readFile(pFilePath);

    let symbols = null;
    const lstFiles = FS.readdir('/').filter(d => d.endsWith('.lst'));
    if (lstFiles.length) {
        const lstText = new TextDecoder().decode(FS.readFile(lstFiles[0]));
        symbols = parseSymbolTable(lstText);
    }

    resolve({ binary, symbols });
}

function parseSymbolTable(lstText) {
    const symbols = {};
    const re = /\*?(\S+)\s+:\s+([0-9A-F]+)\s+C\s*\|/gi;
    let match;
    while ((match = re.exec(lstText)) !== null) {
        const name = match[1];
        const addr = parseInt(match[2], 16);
        if (isNaN(addr)) continue;
        const existing = symbols[addr];
        if (!existing || isBetterLabel(name, existing)) {
            symbols[addr] = name;
        }
    }
    return Object.keys(symbols).length ? symbols : null;
}

function isBetterLabel(candidate, existing) {
    const cInternal = /_End$|_Begin$/i.test(candidate);
    const eInternal = /_End$|_Begin$/i.test(existing);
    if (cInternal !== eInternal) return !cInternal;
    return candidate.length < existing.length;
}

Comlink.expose({
    assemble,
});
