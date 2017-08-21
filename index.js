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

    // mainWindow.setMenu(null);
    mainWindow.openDevTools();
    mainWindow.loadURL('file://' + __dirname + '/web/index.html');

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});

require('chokidar')
    .watch(['web/**/*'], {ignored: /[\/\\]\./})
    .on('change', () => {
        mainWindow.reload();
    });
