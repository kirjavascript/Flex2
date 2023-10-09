import * as Comlink from 'comlink';

const endStr = '__flex2__done__';

const errorList = [];

function assemble(code, { messages, filename }) {
    return new Promise((resolve, reject) => {
        self.Module = {
            locateFile: url => `../wasm/${url}`,
            arguments: ['-q', '-xx', '-L', filename],
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

    resolve(FS.readFile(pFilePath));
}

Comlink.expose({
    assemble,
});
