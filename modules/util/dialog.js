const { dialog } = require('electron').remote;

export function errorMsg(title, message) {
    dialog.showMessageBox({
        title,
        message,
        type: 'error',
        buttons: ['Ok'],
    });
}
