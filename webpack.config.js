let webpack = require('webpack');
let StyleLintPlugin = require('stylelint-webpack-plugin');

module.exports = (env={}, args={}) => {

    let config = {
        target: 'electron',
        entry : {
            root: './modules/root.js',
        },
        output: {
            path: __dirname  + '/static/bundles',
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
                    test: /\.scss$/,
                    use: [
                        { loader:'style-loader' },
                        { loader:'raw-loader' },
                        { loader:'sassjs-loader' },
                        { loader:'import-glob-loader' },
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
            new webpack.DefinePlugin({
                __DEV__: env.dev,
                __WEB__: true,
            }),
            new StyleLintPlugin({
                configFile: '.stylelintrc',
                syntax: 'scss',
            }),
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
