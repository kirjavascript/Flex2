const webpack = require('webpack');

module.exports = (env = {}, args = {}) => {
    const config = {
        target: 'electron-renderer',
        mode: env.dev ? 'development' : 'production',
        entry: {
            root: './app/main.js',
        },
        output: {
            path: __dirname + '/../static/bundles',
            filename: '[name].js',
        },
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: env.dev ? /node_modules/ : void 0,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    '@babel/preset-env',
                                    '@babel/preset-react',
                                ],
                                plugins: [
                                    [
                                        '@babel/plugin-proposal-decorators',
                                        { legacy: true },
                                    ],
                                ]
                            }
                        }
                    ],
                },
                {
                    test: /\.json$/,
                    loader: 'json-loader',
                },
                {
                    test: /\.md$/,
                    loader: 'raw-loader',
                },
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                __DEV__: env.dev
            }),
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
            },
        },
        devtool: env.dev && 'source-map',
    };

    if (!env.dev) {
        config.plugins.push(new webpack.optimize.ModuleConcatenationPlugin());
    }

    return config;
};
