import * as Comlink from 'comlink';

self.Module = {
    locateFile: url => `../wasm/${url}`,
};

importScripts('../wasm/mdcomp_portable.js');

function mdcomp(func, data) {
    const operation = Module[func];
    const sp = Module.stackSave();
    try {
        const dataPtr = _malloc(data.length);
        try {
            writeArrayToMemory(data, dataPtr);
            const outputPtrPtr = Module.stackAlloc(4);
            const outputSizePtr = Module.stackAlloc(4);
            if (operation(dataPtr, data.length, outputPtrPtr, outputSizePtr)) {
                const outputPtr = HEAP32[outputPtrPtr >> 2];
                try {
                    const outputSize = HEAP32[outputSizePtr >> 2];
                    const output = new Uint8Array(outputSize);
                    let outputBuffer = outputPtr;
                    for (let i=0; i < outputSize; i++) {
                        output[i] = HEAP8[outputBuffer++];
                    }
                    return output;
                } finally {
                    _free(outputPtr);
                }
            }
        } finally {
            _free(dataPtr);
        }
    } finally {
        Module.stackRestore(sp);
    }
};

Comlink.expose({ mdcomp });
