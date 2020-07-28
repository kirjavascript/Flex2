import unhandled from 'electron-unhandled';
import { shell } from 'electron';

unhandled({
    // is true in prod
    // showDialog: true,
    reportButton: (e) => {
        shell.openExternal(`https://github.com/kirjavascript/flex2/issues/new?body=${encodeURIComponent(e.stack)}`);
    },
});
