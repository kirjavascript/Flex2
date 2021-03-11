import { loadScript } from './file';
import { logger } from './debug';
import { toJS } from 'mobx';

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
    return (size = constants.dc.w) => [
        () => ({ ref }) => {
            let a = 0x7FFF;
            const headers = [];
            for (let i = 0; i < 1e5 && i < a; i += 2) {
                const header = read(size) & 0x7FFF;
                headers.push(header);
                if (header < a && !(header === 0)) {
                    a = header;
                }
            }
            ref.global.cleanup.push(({ sprites, spritesAddr }) => {
                sprites.splice(0, sprites.length);
                headers.forEach(header => {
                    if (header === 0) {
                        sprites.push([]); // handle zero header optimization
                    } else {
                        sprites.push(spritesAddr[header]);
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

    const [mappingArgs, mappingFunc] = useDef();
    const [dplcArgs, dplcFunc] = useDef();

    (new Function('Flex2', loadScript(file)))({
        ...constants,
        write,
        read,
        mappings: mappingFunc,
        dplcs: dplcFunc,
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

        const global = { cleanup: [] };
        const sprites = [];
        const spritesAddr = {};
        sectionList.forEach(([readFrame], i) => {
            logger(`---section `, i);
            read: for (let spriteIndex = 0; spriteIndex < readLimit; spriteIndex++) {
                logger(`--sprite ${spriteIndex.toString(16)} `);
                const sprite = [];
                const ref = { global };
                spritesAddr[cursor] = sprite;
                const readMapping = readFrame(spriteIndex);
                if (readMapping) {
                    logger('read mapping');
                    for (let frameIndex = 0; frameIndex < readLimit; frameIndex++) {
                        logger(`-frame ${frameIndex.toString(16)} `);
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

    return {
        readMappings,
        readDPLCs,
        writeMappings,
        writeDPLCs,
    };
});
