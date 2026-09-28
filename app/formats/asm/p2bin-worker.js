import * as Comlink from 'comlink';

function binary(pFile, { messages }) {
    return new Promise((resolve, reject) => {
        self.Module = {
            locateFile: url => `../wasm/${url}`,
            arguments: ['-q', 'data.p'],
            print: (text) => {
                console.log('p2bin: ' + text);
            },
            printErr: (text) => {
                reject({
                    name: 'P2BinError',
                    message: text,
                });
            },
            onAbort: (e) => reject(new Error('p2bin aborted: ' + e)),
            preInit: () => {
                FS.writeFile('p2bin.msg', messages.p2binmsg);
                FS.writeFile('ioerrs.msg', messages.ioerrsmsg);
                FS.writeFile('cmdarg.msg', messages.cmdargmsg);
                FS.writeFile('tools.msg', messages.toolsmsg);
                FS.writeFile('data.p', pFile);
            },
            postRun: () => {
                try {
                    resolve(FS.readFile('data.bin'));
                } catch (e) {
                    reject({
                        name: 'P2BinError',
                        message: 'no output produced',
                    });
                }
            },
        };
        importScripts('../wasm/p2bin.js');
    });
}

Comlink.expose({
    binary,
});
