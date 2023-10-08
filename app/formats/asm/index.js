import * as Comlink from 'comlink';

import asmsg from './messages/as.msg';
import ioerrsmsg from './messages/ioerrs.msg';
import cmdargmsg from './messages/cmdarg.msg';

export async function assemble(code) {
    const worker = new Worker('bundles/asl-worker.js')
    const asl = Comlink.wrap(worker);

    console.time('asd');
    await asl.init(code, {
        asmsg,
        ioerrsmsg,
        cmdargmsg,
    });
    console.timeEnd('asd');
    await asl.build();
    // worker.terminate();
}
