import * as Comlink from 'comlink';

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

    const result = await asl.assemble(atLabels(code), { filename });
    aslWorker.terminate();

    const pFile = result.binary || result;
    const symbols = result.symbols || null;

    const p2binWorker = new Worker('bundles/p2bin-worker.js');
    const p2bin = Comlink.wrap(p2binWorker);
    const bin = await p2bin.binary(pFile);
    p2binWorker.terminate();

    return { buffer: bin, symbols };
}
