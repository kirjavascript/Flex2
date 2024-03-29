import { loadScript, scriptDir } from './file';
import { writeASM } from '#formats/scripts';
import { logger } from './debug';
import { toJS } from 'mobx';
import fs from 'fs';
import { join } from 'path';

const binary = Symbol('binary');
const address = Symbol('address');
const signed = Symbol('signed');
const endFrame = Symbol('endFrame');
const skipFrame = Symbol('skipFrame');
const endSection = Symbol('endSection');

export const constants = {
    dc: {
        b: 8,
        w: 16,
        l: 32,
    },
    nybble: 4,
    binary,
    address,
    signed,
    endFrame,
    skipFrame,
    endSection,
};

function useDef() {
    let def = [];
    return [
        new Proxy([], { get: (_, prop) => def[prop] }),
        (...args) => { def = args; },
    ];
}

function useFunc(ref = () => {}) {
    const setFunc = (func) => {ref = func};
    return [(...args) => ref(...args), setFunc];
}

function catchFunc(func) {
    return (...args) => {
        try {
            return func.apply(this, args);
        } catch (error) {
            return { error };
        }
    };
}

function makeOffsetTable({ read, write }) {
    return (size = constants.dc.w, { items } = {}) => [
        ({ getCursor }) => ({ ref }) => {
            const cursor = getCursor();
            const mask = (2 ** (size - 1)) - 1; // 0x7FFF for dc.w
            if (!ref.global.ptr) {
                ref.global.ptr = mask;
            }
            const headers = [];
            // we keep searching for headers until either;
            // - cursor reaches a header pointer value
            // - items is exceeded
            for (let i = cursor; i < 1e5 && i < ref.global.ptr; i = getCursor()) {
                const header = (read(size) & mask) + cursor;
                headers.push(header);
                logger('= HEADER =', header);
                if (header < ref.global.ptr && !(header === 0)) {
                    ref.global.ptr = header;
                }
                if (items && headers.length >= items) break;
            }
            if (!ref.global.firstHeader) {
                ref.global.firstHeader = true;
                ref.global.cleanup.push(({ sprites }) => {
                    sprites.splice(0, sprites.length);
                });
            }
            ref.global.cleanup.push(({ sprites, spritesAddr }) => {
                headers.forEach(header => {
                    if (header === 0) {
                        sprites.push([]); // handle zero header optimization
                    } else {
                        if (spritesAddr[header]) {
                            sprites.push(spritesAddr[header]);
                        } else {
                            logger('error', 'no sprite at ' + header);
                        }
                    }
                });
            });
            return constants.endSection;
        },
        ({ ref }, spriteIndex) => {
            if (spriteIndex === 0) {
                ref.global.cleanup.push(({ sections }) => {
                    const [header, mappings] = sections;

                    let cursor = size * mappings.length; // bits

                    mappings.forEach((frames, i)=> {
                        const addr = header[i];
                        addr.push([[address, size, cursor / 8]]);

                        frames.forEach(frame => {
                            frame.forEach(([, size]) => {
                                cursor += size;
                            });
                        });
                    });

                });
            }
        },
    ];
}


export default catchFunc((file) => {
    const [write, setWrite] = useFunc();
    const [read, setRead] = useFunc();

    const [artArgs, artFunc] = useDef();
    const [mappingArgs, mappingFunc] = useDef();
    const [dplcArgs, dplcFunc] = useDef();
    const [paletteArgs, paletteFunc] = useDef();
    const [asmArgs, asmFunc] = useDef();

    (new Function('Flex2', loadScript(file)))({
        ...constants,
        write,
        read,
        art: artFunc,
        mappings: mappingFunc,
        dplcs: dplcFunc,
        palettes: paletteFunc,
        asm: asmFunc,
        offsetTable: makeOffsetTable({ read, write }),
    });

    const readLimit = 1e3;

    const createReader = (sectionList = []) => catchFunc((buffer) => {
        logger('buf length', buffer.length);
        const bitBuffer = [];
        let cursor = 0;
        let bufferOverflow = false;
        setRead((size, type) => {
            if (size > bitBuffer.length) {
                const nextBitQty = size - bitBuffer.length;
                const bitsLeft = (buffer.length - cursor) * 8;
                if (bitsLeft < nextBitQty) {
                    bufferOverflow = true;
                } else {
                    // fill the buffer
                    const bytesNeeded = Math.ceil(nextBitQty/8);

                    const bytes = Array.from(buffer.slice(cursor, cursor + bytesNeeded));
                    logger('buffer', ...bytes.map(b => b.toString(16)))

                    const bits = bytes.map(d => d.toString(2).padStart(8, 0))
                        .join('')
                        .split('')
                        .map(Number);

                    cursor += bytesNeeded
                    bitBuffer.push(...bits);
                }
            }

            // flush the buffer
            const binString = bitBuffer.splice(0, size).join('')
            if (type === signed && binString[0] === '1') {
                return ((1 << size) - parseInt(binString, 2)) * -1;
            }
            const value = parseInt(binString, 2);
            logger('read', {size, value}, cursor, binString);
            return value;
        });

        const getCursor = () => cursor;
        const global = { cleanup: [] };
        const sprites = [];
        const spritesAddr = {};
        sectionList.forEach(([readFrame], i) => {
            logger(`====== SECTION ======`, i);
            read: for (let spriteIndex = 0; spriteIndex < readLimit; spriteIndex++) {
                if (cursor >= buffer.length) break;
                logger(`== SPRITE == ${spriteIndex.toString(16)} `);
                const sprite = [];
                const ref = { global };
                spritesAddr[cursor] = sprite;
                const readMapping = readFrame({ getCursor }, spriteIndex);
                if (readMapping) {
                    logger('read mapping');
                    for (let frameIndex = 0; frameIndex < readLimit; frameIndex++) {
                        logger(`= FRAME = ${frameIndex.toString(16)} `);
                        const mapping = {};
                        const param = {
                            mapping,
                            sprites,
                            sprite,
                            ref,
                        };
                        const result = readMapping(param, frameIndex, spriteIndex);
                        if ('priority' in mapping)
                            mapping.priority = Boolean(mapping.priority);
                        if ('vflip' in mapping)
                            mapping.vflip = Boolean(mapping.vflip);
                        if ('hflip' in mapping)
                            mapping.hflip = Boolean(mapping.hflip);
                        if (result === constants.endSection || bufferOverflow) {
                            break read;
                        }
                        logger('mapping', mapping);
                        sprite.push(mapping);
                        if (result === constants.endFrame) {
                            logger('end frame');
                            break;
                        }
                    }
                }
                sprites.push(sprite);
            }

        });
        logger('spritesAddr', spritesAddr);

        global.cleanup.forEach(task => task({ sprites, spritesAddr }));

        return {sprites};
    });

    const readMappings = createReader(mappingArgs[0]);
    const readDPLCs = createReader(dplcArgs[0]);

    const unsign = (size, num) => {
        if (num < 0) {
            return num + (1 << size);
        }
        return num;
    };

    const createWriter = (sectionList = []) => catchFunc((mappings) => {
        // mapping output format is [type, size, data]

        const global = { cleanup: [] };
        const sections = sectionList.map(([, writeFrame]) => {
            const spriteList = toJS(mappings);
            const sprites = [];

            for (let spriteIndex = 0; spriteIndex < spriteList.length; spriteIndex++) {
                const sprite = spriteList[spriteIndex];
                const ref = { global };
                const mappings = []
                setWrite((size, data, type = binary) => {
                    mappings.push([[type, size, unsign(size, +data)]]);
                });
                const writeMapping = writeFrame({ sprite, ref }, spriteIndex);

                if (writeMapping) {
                    for (let frameIndex = 0; frameIndex < sprite.length; frameIndex++) {
                        const mapping = sprite[frameIndex];
                        const frame = [];
                        setWrite((size, data, type = binary) => {
                            frame.push([type, size, unsign(size, +data)]);
                        });
                        const param = {
                            mapping,
                            sprite,
                            sprites,
                            ref,
                        };
                        const result = writeMapping(param, frameIndex, spriteIndex);
                        if (result === constants.endSection) {
                            return sprites; // really end the section
                        }
                        mappings.push(frame);
                        if (result === constants.endFrame) {
                            break;
                        }
                    }
                }
                sprites.push(mappings);

            }
            return sprites;
        });

        global.cleanup.forEach(task => task({ sections }));

        return {sections};
    });

    const writeMappings = createWriter(mappingArgs[0]);
    const writeDPLCs = createWriter(dplcArgs[0]);

    const exports = {
        mappings: true,
        readMappings,
        writeMappings,
    };

    if (dplcArgs[0]) {
        Object.assign(exports, {
            DPLCs: true,
            readDPLCs,
            writeDPLCs,
        });
    }

    if (artArgs[0]) {
        const [readArt, writeArt] = artArgs[0];
        Object.assign(exports, {
            art: true,
            readArt,
            writeArt,
        });
    }

    if (paletteArgs[0]) {
        const [readPalettes, writePalettes] = paletteArgs[0];
        Object.assign(exports, {
            palettes: true,
            readPalettes,
            writePalettes,
        });
    }


    const asm = {
        basic: false,
        prelude: `
even macro
    if (*)&1
        dc.b 0 ;ds.b 1
    endif
    endm
`,
    };

    if (asmArgs[0]) {
        const [writeMappingsArgs, writeMappingsFunc] = useDef();
        const [writeDPLCsArgs, writeDPLCsFunc] = useDef();

        function basic() {
            asm.basic = true;
        }

        function addScript(code) {
            asm.prelude += code;
        }

        function importScript(path) {
            const contents = fs.readFileSync(join(scriptDir, path), 'utf8');
            if (contents) {
                asm.prelude += contents;
            }
        }

        asmArgs[0]({
            basic,
            addScript,
            importScript,
            writeMappings: writeMappingsFunc,
            writeDPLCs: writeDPLCsFunc,
        });

        if (writeMappingsArgs[0]) {
            asm.writeMappings = writeMappingsArgs[0];
        }

        if (writeDPLCsArgs[0]) {
            asm.writeDPLCs = writeDPLCsArgs[0];
        }
    }

    exports.asm = asm;

    const renderHex = num => {
        let out = '';
        if (num < 0) out += '-';
        num = Math.abs(num);
        if (num > 9) out += '$';
        out += num.toString(16).toUpperCase();
        return out;
    };

    exports.generateMappingsASM = function({
        label,
        sprites,
        listing,
    }) {
        if (!asm.writeMappings) {
            return writeASM(label, listing);
        }

        return asm.writeMappings({
            label, sprites, listing,
            renderHex,
        });
    };

    exports.generateDPLCsASM = function({
        label,
        sprites,
        listing,
    }) {
        if (!asm.writeDPLCs) {
            return writeASM(label, listing);
        }

        return asm.writeDPLCs({
            label, sprites, listing,
            renderHex,
        });
    };

    return exports;
});
