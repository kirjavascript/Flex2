const { app, BrowserWindow } = require('electron');
let mainWindow = null;

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        center: true,
        resizable: false,
    });

    mainWindow.setMenu(null);
    mainWindow.openDevTools();
    mainWindow.loadURL('file://' + __dirname + '/static/index.html');

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});

// webpack reload

const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js')({dev:true});
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
