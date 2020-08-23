const globals = {
    dc: {
        b: 8,
        w: 16,
        l: 32,
    },
    nybble: 4,
    read: (size) => ({ read: size }),
    write: (_write) => {},
};

export default function(source) {
    const config = {};
    const definition = [];
    (new Function('Flex2', source))(new Proxy({}, {
        get: (_target, prop) => {
            if (globals[prop]) {
                return globals[prop];
            }
            return (...args) => {
                definition[prop] = args;
            };
        },
    }));
    return definition;
}
