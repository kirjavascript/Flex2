// Dummy webpack module resolving definition for tern
// This is a copy of the (actually used) resolve definition in .babelrc

module.exports = (env={}) => {

    let config = {
        entry : {
            root: './modules/root.js',
        },
        resolve: {
            extensions: ['.js', '.json', '.jsx'],
            alias: {
                '#store': __dirname + '/modules/store',
                '#components': __dirname + '/modules/components',
                '#controls': __dirname + '/modules/controls',
                '#ui': __dirname + '/modules/components/ui',
                '#util': __dirname + '/modules/util',
                '#lib': __dirname + '/modules/lib',
                '#formats': __dirname + '/modules/formats',
                '#styles': __dirname + '/styles/',
            },
        },
    };

    return config;

}
