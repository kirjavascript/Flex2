import * as Comlink from 'comlink';

import asmsg from './messages/as.msg';
import ioerrsmsg from './messages/ioerrs.msg';
import cmdargmsg from './messages/cmdarg.msg';
import p2binmsg from './messages/p2bin.msg';
import toolsmsg from './messages/tools.msg';

const asMessages = {
    asmsg,
    ioerrsmsg,
    cmdargmsg,
};

const p2binMessages = {
    p2binmsg,
    ioerrsmsg,
    cmdargmsg,
    toolsmsg,
};

function atLabels(code) {
    const labels = /^@[a-zA-Z0-9_$]+\s*:/gm;

    while (true) {
        const result = labels.exec(code);
        if (!result) break;
        const label = result[0].slice(0, -1);
        code = code.replace(new RegExp(label, 'g'), `._at_${label.slice(1)}`);
    }

    return code;
}

export async function assemble(
    code,
    { filename } = {
        filename: 'code.asm',
    },
) {
    const aslWorker = new Worker('bundles/asl-worker.js');
    const asl = Comlink.wrap(aslWorker);

    const pFile = await asl.assemble(atLabels(code), {
        messages: asMessages,
        filename,
    });
    aslWorker.terminate();

    const p2binWorker = new Worker('bundles/p2bin-worker.js');
    const p2bin = Comlink.wrap(p2binWorker);
    const bin = await p2bin.binary(pFile, {
        messages: p2binMessages,
    });
    p2binWorker.terminate();

    return bin;
}
