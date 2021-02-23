import { loadScript } from './file';
import { toJS } from 'mobx';

const binary = Symbol('binary');
const address = Symbol('address');
const signed = Symbol('signed');
const endFrame = Symbol('endFrame');
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
    return (size = constants.dc.w, func) => [
        ({ ref }) => {
            let a = 0x7FFF;
            const headers = [];
            for (let i = 0; i < 1e5 && i < a; i += 2) {
                const header = read(constants.dc.w) & 0x7FFF;
                headers.push(header);
                if (header < a && !(header == 0)) {
                    a = header;
                }
            }
            ref.global.headers = headers;
            return constants.endSection;
        },
        ({ ref, sprite, sprites }, frameIndex, spriteIndex) => {
            if (spriteIndex === 0 && frameIndex === 0) {
               ref.global[address] = sprites.length * size / constants.dc.b;
            }
            if (frameIndex === 0) {
                // TODO: add initial header offset
                // console.log(ref.global[address].toString(16));
                // console.log(sprite.length);
                write(size, ref.global[address], address);
                ref.global[address] += func(sprite.length);
                // 000c 0036 0068 00a2 00e4 00ee
            }
        },
    ];
}

// TODO: negative numbers in write

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

    const createReader = (sectionList) => catchFunc((buffer) => {
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
            return parseInt(binString, 2);
        });

        const global = {};
        const sprites = [];
        sectionList.forEach(([readFrame]) => {
            read: for (let spriteIndex = 0; spriteIndex < readLimit; spriteIndex++) {
                const sprite = [];
                const ref = { global };
                for (let frameIndex = 0; frameIndex < readLimit; frameIndex++) {
                    const mapping = {};
                    const param = {
                        mapping,
                        ref,
                    };
                    const result = readFrame(param, frameIndex, spriteIndex);
                    mapping.priority = Boolean(mapping.priority);
                    mapping.vflip = Boolean(mapping.vflip);
                    mapping.hflip = Boolean(mapping.hflip);
                    if (result === constants.endSection || bufferOverflow) {
                        break read;
                    }
                    sprite.push(mapping);
                    if (result === constants.endFrame) {
                        break;
                    }
                }

                sprites.push(sprite);
            }

        });

        return {sprites};
    });

    const readMappings = createReader(mappingArgs[0]);
    const readDPLCs = createReader(dplcArgs[0]);

    const createWriter = (sectionList) => catchFunc((env) => {
        const global = {};
        const sections = sectionList.map(([, writeFrame]) => {
            const sprites = toJS(env.mappings);
            return sprites.map((sprite, spriteIndex) => {
                const ref = { global };
                const mappings = []
                sprite.forEach((mapping, frameIndex) => {
                    const frame = [];
                    setWrite((size, data, type = binary) => {
                        frame.push([type, size, +data]);
                    });
                    const param = {
                        mapping,
                        sprite,
                        sprites,
                        ref,
                    };
                    writeFrame(param, frameIndex, spriteIndex);
                    mappings.push(frame);
                });

                return mappings;
            });
        });

        const chunks = sections.flat(3);

        return {sections, chunks};
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
