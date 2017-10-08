const { app, BrowserWindow } = require('electron');
let mainWindow = null;

app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        title: 'Flex 2',
        backgroundColor: '#282C34',
        width: 1200,
        height: 800,
        center: true,
        resizable: true,
        show: false,
    });

    mainWindow.setMenu(null);
    mainWindow.loadURL('file://' + __dirname + '/static/index.html');

    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    mainWindow.on('ready-to-show', function() {
        mainWindow.show();
        mainWindow.focus();
    });

    // development...

    process.argv.includes('--dev') &&
    require('./development')(app, mainWindow);

});
