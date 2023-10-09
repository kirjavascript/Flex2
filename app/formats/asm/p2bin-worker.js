import * as Comlink from 'comlink';

const endStr = '__flex2__done__';

function binary(pFile, { messages }) {
    return new Promise((resolve, reject) => {
        self.Module = {
            locateFile: url => `../wasm/${url}`,
            arguments: ['-q', 'data.p'],
            print: (text) => {
                if (text === endStr) return resolve(FS.readFile('data.bin'));
                console.log('p2bin: ' + text);
            },
            printErr: (text) => {
                reject({
                    name: 'P2BinError',
                    message: text,
                });
            },
            onAbort: console.error,
            preInit: () => {
                FS.writeFile('p2bin.msg', messages.p2binmsg);
                FS.writeFile('ioerrs.msg', messages.ioerrsmsg);
                FS.writeFile('cmdarg.msg', messages.cmdargmsg);
                FS.writeFile('tools.msg', messages.toolsmsg);
                FS.writeFile('data.p', pFile);
            },
        };
        importScripts('../wasm/p2bin.js');
    });
}

Comlink.expose({
    binary,
});
