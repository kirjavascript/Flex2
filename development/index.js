const { writeFile } = require('fs');

module.exports = (app, mainWindow) => {


    mainWindow.openDevTools();

    // webpack reload

    const webpack = require('webpack');
    const webpackConfig = require('./webpack.config.js')({dev: true});
    const compiler = webpack(webpackConfig);

    compiler.watch({

        aggregateTimeout: 300,
        poll: true

    }, (err, stats) => {

        if (err) {
            console.error(err)
        }
        else {
            console.log(stats.toString({colors:true, chunks:false}));
            console.log('Sending reload signal...');
            mainWindow.reload();
        }

    });

    // sass.js SCSS compiler
    // node-sass doesn't work in electron...

    const sassCompiler = require('sass.js/dist/sass.node');

    const options = {
        style: sassCompiler.Sass.style.compressed,
    };

    const buildSass = () => {
        sassCompiler('styles/root.scss', options, function(result) {
            if (result.status) {
                console.error(result.formatted);
            }
            else {
                writeFile(
                    './static/bundles/root.css',
                    result.text,
                    (err) => {
                        if (err) {
                            console.error(err);
                        }
                        else {
                            mainWindow.reload();
                            console.log('SCSS Compiled');
                        }
                    }
                );
            }
        });
    };

    buildSass();

    require('chokidar')
        .watch('./styles', {ignored: /[\/\\]\./})
        .on('change', buildSass);
};
