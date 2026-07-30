import * as Comlink from 'comlink';

const ready = new Promise(resolve => {
    self.Module = {
        locateFile: url => `../wasm/${url}`,
        onRuntimeInitialized: resolve,
    };
});

importScripts('../wasm/mdcomp_portable.js');

async function mdcomp(func, data) {
    await ready;
    const operation = Module[func];
    const sp = Module.stackSave();
    try {
        const dataPtr = Module._malloc(data.length);
        try {
            Module.writeArrayToMemory(data, dataPtr);
            const outputPtrPtr = Module.stackAlloc(4);
            const outputSizePtr = Module.stackAlloc(4);
            if (operation(dataPtr, data.length, outputPtrPtr, outputSizePtr)) {
                const outputPtr = Module.HEAP32[outputPtrPtr >> 2];
                try {
                    const outputSize = Module.HEAP32[outputSizePtr >> 2];
                    const output = new Uint8Array(outputSize);
                    let outputBuffer = outputPtr;
                    for (let i=0; i < outputSize; i++) {
                        output[i] = Module.HEAP8[outputBuffer++];
                    }
                    return output;
                } finally {
                    Module._free(outputPtr);
                }
            }
        } finally {
            Module._free(dataPtr);
        }
    } finally {
        Module.stackRestore(sp);
    }
};

Comlink.expose({ mdcomp });
