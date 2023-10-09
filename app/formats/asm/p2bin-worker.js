import * as Comlink from 'comlink';

const endStr = '__flex2__done__';

const errorList = [];

function binary(pFile, { messages }) {
    return new Promise((resolve, reject) => {
        self.Module = {
            locateFile: url => `../wasm/${url}`,
            arguments: ['data.p'],
            print: (text) => {
                console.log(1);
                if (text === endStr) return handleResult(resolve, reject);
                console.log('p2bin: ' + text);
            },
            printErr: (text) => {
                errorList.push(text);
            },
            onAbort: console.error,
            preInit: () => {
                FS.writeFile('p2bin.msg', messages.p2binmsg);
                FS.writeFile('data.p', pFile);
                console.log(1);
            },
        };
        console.log(1);
        importScripts('../wasm/p2bin.js');
    });
}

function handleResult(resolve, reject) {
    if (errorList.length) return reject({
        name: 'P2BinError',
        message: '\n\n' + errorList.join('\n')
    });

    // const outputs = FS.readdir('/').filter(d => d.endsWith('.bin'));

    // if (!outputs.length) return reject(new Error('cannot find .bin'));

    // const [binPath] = outputs;

    // resolve(FS.readFile(binPath));
}

Comlink.expose({
    binary,
});
