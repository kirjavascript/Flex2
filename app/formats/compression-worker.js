import * as nlz from './nlz';

const ready = new Promise(resolve => {
    self.Module = {
        locateFile: url => `../wasm/${url}`,
        onRuntimeInitialized: resolve,
    };
});

importScripts('../wasm/mdcomp_portable.js');

class InvalidData extends Error {
    message = 'invalid data';
}

const NLZ_MODULE_CONFIG = 3; // 0x800 byte modules

const js = {
    _nlz_decode: data => nlz.decompress(data),
    _nlz_encode: data => nlz.compress(data, 0),
    _moduled_nlz_decode: data => nlz.decompress(data),
    _moduled_nlz_encode: data => nlz.compress(data, NLZ_MODULE_CONFIG),
};

function runJS(func, data) {
    try {
        return js[func](data);
    } catch (e) {
        const error = new InvalidData();
        error.message = e.message;
        throw error;
    }
}

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
            throw new InvalidData();
        } finally {
            Module._free(dataPtr);
        }
    } finally {
        Module.stackRestore(sp);
    }
};

self.addEventListener('message', async ({ data: { id, func, data } }) => {
    try {
        const result = js[func] ? runJS(func, data) : await mdcomp(func, data);
        self.postMessage({ id, result }, [result.buffer]);
    } catch (e) {
        // anything else is likely a wasm trap, after which the module is unusable
        const fatal = !(e instanceof InvalidData);
        self.postMessage({ id, error: e?.message || String(e), fatal });
    }
});
