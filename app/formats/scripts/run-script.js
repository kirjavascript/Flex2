import { loadScript } from './file';
import { toJS } from 'mobx';

const constants = {
    dc: {
        b: 8,
        w: 16,
        l: 32,
    },
    nybble: 4,
};


function useDef(def = {}) {
    const setDef = (config) => Object.assign(def, config);
    return [def, setDef];
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

export default catchFunc((file) => {
    const errors = [];

    const [write, setWrite] = useFunc();
    const [read, setRead] = useFunc();

    const [mappings, setMappings] = useDef();
    const [dplcs, setDPLCs] = useDef();

    const offsetTable = () => [null, null];

    (new Function('Flex2', loadScript(file)))({
        ...constants,
        write,
        mappings: setMappings,
        dplcs: setDPLCs,
        offsetTable: () => [],
    });

    const dumpMappings = catchFunc((env) => {
        if (!mappings.sprites) throw new Error('Sprite mappings are undefined');

        const [, writeFrame] = mappings.sprites;
        const sprites = [];
        const header = [];
        const footer = [];

        if (mappings.header) {

        }



        // TODO: genericize

        toJS(env.mappings).forEach((mapList) => {
            const mappings = []
            mapList.forEach((mapping, index) => {
                const frame = [];
                setWrite((size, data) => {
                    frame.push([size, data]);
                });
                mapping.ref = {};
                mapping.parent = mapList;
                mapping.offset = mapping.art;
                writeFrame(mapping, index);
                mappings.push(frame);
            });

            sprites.push(mappings);
        });

        return {sprites};
    });


    return {
        // definition,
        dumpMappings,
    };
});
