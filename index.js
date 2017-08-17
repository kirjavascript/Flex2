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

    // mainWindow.openDevTools();
    // mainWindow.maximize();

    mainWindow.loadURL('file://' + __dirname + '/src/index.html');

    // mainWindow.setMenu(null);

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});

require('chokidar')
    .watch(['src/**/*'], {ignored: /[\/\\]\./})
    .on('change', () => {
        mainWindow.reload();
    });
