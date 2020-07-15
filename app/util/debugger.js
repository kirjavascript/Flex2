import unhandled from 'electron-unhandled';
import { shell } from 'electron';

unhandled({
    reportButton: (e) => {
        shell.openExternal(`https://github.com/kirjavascript/flex2/issues/new?body=${encodeURIComponent(e.stack)}`);
    },
});
