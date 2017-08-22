module.exports = (env={}, args={}) => {

    let config = {
        target: 'electron',
        entry : {
            root: './modules/root.js',
        },
        output: {
            path: __dirname  + '/../static/bundles',
            filename: '[name].js',
        },
        module: {
            loaders: [
                {
                    test: /\.js$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    'stage-0'
                                ],
                                plugins: [
                                    'transform-react-jsx',
                                    'transform-decorators-legacy',
                                    'transform-class-properties',
                                ]
                            }
                        }
                    ]
                },
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    loader: 'eslint-loader',
                    options: {
                        configFile: '.eslintrc',
                        failOnWarning: false,
                        failOnError: false,
                        emitError: false,
                        fix: true
                    }
                }
            ],
        },
        plugins: [
        ],
        resolve: {
            extensions: ['.js', '.json'],
            alias: {
                '#js': __dirname + '/modules/js',
            }

        },
        devtool: env.dev ? 'source-map' : false,
    };

    return config;

}
