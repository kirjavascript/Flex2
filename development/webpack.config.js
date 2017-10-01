const webpack = require('webpack');

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
                    test: /\.jsx?$/,
                    exclude: /node_modules/,
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
                    test: /\.json$/,
                    loader: 'json-loader'
                },
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    loader: 'eslint-loader',
                    exclude: /node_modules/,
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
            extensions: ['.js', '.json', '.jsx'],
            alias: {
                '#store': __dirname + '/../modules/store',
                '#components': __dirname + '/../modules/components',
                '#controls': __dirname + '/../modules/controls',
                '#ui': __dirname + '/../modules/components/ui',
                '#util': __dirname + '/../modules/util',
                '#lib': __dirname + '/../modules/lib',
                '#formats': __dirname + '/../modules/formats',
                '#styles': __dirname + '/../styles/',
            }

        },
    };

    if (env.dev) {
        // config.devtool = 'eval';
    }
    else {
        config.plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
    }

    return config;

}
