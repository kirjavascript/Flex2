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

export async function assemble(
    code,
    { filename } = {
        filename: 'code.asm',
    },
) {
    const aslWorker = new Worker('bundles/asl-worker.js');
    const asl = Comlink.wrap(aslWorker);

    const pFile = await asl.assemble(code, {
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
