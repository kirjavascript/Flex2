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

function useDef() {
    const def = {};
    const setDef = (config) => Object.assign(def, config);
    return [def, setDef];
}

function useFunc() {
    let ref = () => {};
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
    // const definition = [];
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

        const [_readFrame, writeFrame] = mappings.sprites;

        const sprites = [];

        // console.log(toJS(env.mappings));

        toJS(env.mappings).forEach((mapList) => {
            const mappings = []
            mapList.forEach((mapping, index) => {
                console.log(mapping);
                const frame = [];
                setWrite((size, data) => {
                    frame.push(size, data);
                });
                // mapping.ref = {};
                // mapping.parent = mapList;
                // writeFrame(mapping, index);
                mappings.push(frame);
            });

            sprites.push(mappings);
        });

        writeFrame();

        return {a:1};
    });


    return {
        // definition,
        dumpMappings,
    };
});
