const { app, BrowserWindow } = require('electron');
const flexDevTools = require('./development');
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
    mainWindow.loadURL('file://' + __dirname + '/static/index.html');

    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    // development...

    flexDevTools(app, mainWindow);

});
