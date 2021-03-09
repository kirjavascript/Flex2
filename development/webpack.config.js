const webpack = require('webpack');

module.exports = (env = {}, args = {}) => {
    const config = {
        target: 'electron-renderer',
        mode: env.dev ? 'development' : 'production',
        entry: {
            main: './app/main.js',
        },
        output: {
            path: __dirname + '/../static/bundles',
            filename: '[name].js',
        },
        module: {
            rules: [
                {
                    test: /\.m?jsx?$/,
                    exclude: env.dev ? /node_modules/ : void 0,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    ['@babel/preset-env', {
                                        targets: {
                                            electron: 8,
                                        },
                                    }],
                                    '@babel/preset-react',
                                ],
                                plugins: [
                                    [
                                        '@babel/plugin-proposal-decorators',
                                        { legacy: true },
                                    ],
                                    [
                                        '@babel/plugin-proposal-class-properties',
                                        { loose: true },
                                    ],
                                    '@babel/plugin-proposal-optional-chaining',
                                ]
                            }
                        }
                    ],
                },
                {
                    test: /\.md$/,
                    loader: 'raw-loader',
                },
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                __DEV__: env.dev,
                __REACT_DEVTOOLS_GLOBAL_HOOK__: '({ isDisabled: true })',
            }),
        ],
        resolve: {
            symlinks: false,
            extensions: ['.js'],
            alias: {
                '#store': __dirname + '/../app/store',
                '#components': __dirname + '/../app/components',
                '#controls': __dirname + '/../app/controls',
                '#ui': __dirname + '/../app/components/ui',
                '#util': __dirname + '/../app/util',
                '#lib': __dirname + '/../app/lib',
                '#formats': __dirname + '/../app/formats',
                '#styles': __dirname + '/../styles/',
            },
        },
        devtool: env.dev && 'source-map',
    };

    if (!env.dev) {
        config.plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
    }

    return config;
};
