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
        const asmFile = FS.readdir('/').find(d => d.endsWith('.asm'));
        const source = asmFile ? new TextDecoder().decode(FS.readFile(asmFile)) : '';
        symbols = parseSymbolTable(lstText, source);
    }

    resolve({ binary, symbols });
}

function parseSymbolTable(lstText, source) {
    const labelOrder = new Map();
    const labelRe = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/gm;
    let m;
    while ((m = labelRe.exec(source)) !== null) {
        labelOrder.set(m[1], m.index);
    }

    const addrLabels = {};
    const re = /\*?(\S+)\s+:\s+([0-9A-F]+)\s+C\s*\|/gi;
    let match;
    while ((match = re.exec(lstText)) !== null) {
        const name = match[1];
        const addr = parseInt(match[2], 16);
        if (isNaN(addr)) continue;
        if (/_End$|_Begin$/i.test(name)) continue;
        if (!addrLabels[addr]) addrLabels[addr] = [];
        addrLabels[addr].push(name);
    }

    const symbols = {};
    for (const [addr, labels] of Object.entries(addrLabels)) {
        if (labels.length === 1) {
            symbols[addr] = labels[0];
        } else {
            labels.sort((a, b) => (labelOrder.get(a) ?? -1) - (labelOrder.get(b) ?? -1));
            symbols[addr] = labels[labels.length - 1];
        }
    }
    return Object.keys(symbols).length ? symbols : null;
}

Comlink.expose({
    assemble,
});
