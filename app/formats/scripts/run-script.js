import { loadScript } from './file';
import { toJS } from 'mobx';

const binary = Symbol('binary');
const address = Symbol('address');

export const constants = {
    dc: {
        b: 8,
        w: 16,
        l: 32,
    },
    nybble: 4,
    binary,
    address,
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

function makeOffsetTable({ write }) {
    return (size = constants.dc.w, func) => [
        () => {
            // TODO
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
        offsetTable: makeOffsetTable({ write }),
    });

    const readLimit = 1e3;

    const readMappings = catchFunc((env, buffer) => {
        const [mappings] = mappingArgs;
        if (!mappings) throw new Error('Sprite mappings are undefined');

        const bitBuffer = [];
        let cursor = 0;
        let bufferOverflow = false;
        setRead((size) => {
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
            return  parseInt(bitBuffer.splice(0, size).join(''), 2);
        });

        const global = {};
        const sections = mappings.map(([readFrame]) => {
            const sprites = [];

            // setRead should say if it's empty

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
                    if (bufferOverflow) {
                        break read;
                    }
                    sprite.push(mapping);
                    if (result) {
                        break;
                    }
                }

                sprites.push(sprite);
            }

            return sprites;
        });

        return {sections};
    });

    const dumpMappings = catchFunc((env) => {
        const [mappings] = mappingArgs;
        if (!mappings) throw new Error('Sprite mappings are undefined');

        const global = {};
        const sections = mappings.map(([, writeFrame]) => {
            const sprites = toJS(env.mappings);
            return sprites.map((sprite, spriteIndex) => {
                const ref = { global };
                const mappings = []
                sprite.forEach((mapping, frameIndex) => {
                    const frame = [];
                    setWrite((size, data, type = binary) => {
                        frame.push([type, size, +data]);
                    });
                    mapping.offset = mapping.art;
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

        return {sections};
    });


    return {
        readMappings,
        dumpMappings,
    };
});
