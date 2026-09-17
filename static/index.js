const { app, BrowserWindow } = require('electron');
const devMode = process.argv.includes('--dev');

function createWindow() {
    require('./remote/main').initialize();
    const mainWindow = new BrowserWindow({
        title: 'Flex 2',
        backgroundColor: '#282C34',
        width: 1200,
        height: 800,
        center: true,
        resizable: true,
        darkTheme: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });

    require('./remote/main').enable(mainWindow.webContents);

    mainWindow.setMenu(null);

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        const toggle =
            input.key === 'F12' ||
            (input.key.toUpperCase() === 'I' &&
                input.shift &&
                (process.platform === 'darwin' ? input.meta : input.control));
        if (toggle) {
            event.preventDefault();
            mainWindow.webContents.toggleDevTools();
        }
    });

    mainWindow.loadFile('./index.html');

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
        if (!devMode) {
            mainWindow.focus();
        }
    });

    if (devMode) {
        require('./../development/build')({ mainWindow });
    }
}

app.allowRendererProcessReuse = true;

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
