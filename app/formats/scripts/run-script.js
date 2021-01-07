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

function offsetTable(size = constants.dc.w) {
    return [
        () => {

        },
        () => {

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
        offsetTable,
    });

    // offsetTable
    // asm out
    // binary out
    // read

    const dumpMappings = catchFunc((env) => {
        const [mappings] = mappingArgs;

        if (!mappings) throw new Error('Sprite mappings are undefined');

        const sections = mappings.map(([, writeFrame]) => (
            toJS(env.mappings).map((mapList) => {
                const ref = {};
                const mappings = []
                mapList.forEach((mapping, index) => {
                    const frame = [];
                    setWrite((size, data) => {
                        frame.push([size, data]);
                    });
                    Object.assign(mapping, {
                        ref,
                        parent: mapList,
                        offset: mapping.art,
                    })
                    writeFrame(mapping, index);
                    mappings.push(frame);
                });

                return mappings;
            })
        ));

        return {sections};
    });


    return {
        // definition,
        dumpMappings,
    };
});
