const { writeFile } = require('fs');

module.exports = ( mainWindow) => {
    // webpack reload

    const webpack = require('webpack');
    const webpackConfig = require('./webpack.config.js')({ dev: true });
    const compiler = webpack(webpackConfig);

    compiler.watch({ aggregateTimeout: 300 }, (err, stats) => {
        if (err) {
            console.error(err);
        } else {
            console.log(stats.toString({ colors: true, chunks: false }));
            console.log('Sending reload signal...');
            mainWindow.reload();
        }
    });

    const sass = require('node-sass');

    const buildSass = () => {
        sass.render({ file: 'styles/main.scss' }, (err, result) => {
            if (err) return console.error(err);
            writeFile('./static/bundles/main.css', result.css.toString(), err => {
                if (err) return console.error(err);
                mainWindow.reload();
                console.log('SCSS Compiled');
            });
        });
    };

    buildSass();

    require('chokidar')
        .watch('./styles', { ignored: /[\/\\]\./ })
        .on('change', buildSass);
};
