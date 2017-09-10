export const compressionFormats = {
    'Uncompressed': [void 0, void 0],
    'Nemesis': [_nemesis_encode, _nemesis_decode],
    'Kosinski': [_kosinski_encode, _kosinski_decode],
    'Kosinski-M': [_moduled_kosinski_encode, _moduled_kosinski_decode],
    'Comper': [_comper_encode, _comper_decode],
    // 'Enigma': [_enigma_encode, _enigma_decode],
};

export function decompress(buffer, compression) {
    const operation = compressionFormats[compression][1];

    if (!operation) {
        return new Uint8Array(buffer);
    }
    else {
        return KENSC(buffer, operation);
    }
}

function KENSC(input, operation) {
    let sp = Runtime.stackSave();
    try {
        let inputPtr = _malloc(input.length);
        try {
            writeArrayToMemory(input, inputPtr);
            let outputPtrPtr = Runtime.stackAlloc(4);
            let outputSizePtr = Runtime.stackAlloc(4);
            if (operation(inputPtr, input.length, outputPtrPtr, outputSizePtr)) {
                let outputPtr = HEAP32[outputPtrPtr >> 2];
                try {
                    let outputSize = HEAP32[outputSizePtr >> 2];
                    let output = new Uint8Array(outputSize);
                    let outputBuffer = outputPtr;
                    for (let i=0; i < outputSize; i++) output[i] = HEAP8[outputBuffer++];
                    return output;

                } finally {
                    _free(outputPtr);
                }
            }
        } finally {
            _free(inputPtr);
        }
    } finally {
        Runtime.stackRestore(sp);
    }
}
