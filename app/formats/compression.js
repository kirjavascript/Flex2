export const compressionFormats = {
    'Uncompressed': undefined,
    'Nemesis': 'nemesis',
    'Kosinski': 'kosinski',
    'Kosinski-M': 'moduled_kosinski',
    'KosinskiPlus': 'kosplus',
    'KosinskiPlus-M': 'moduled_kosplus',
    'Comper': 'comper',
    'ComperX': 'comperx',
    'ComperX-M': 'moduled_comperx',
    'Enigma': 'enigma',
    'ArtC42': 'artc42',
    'LZKN1': 'lzkn1',
    'Rocket': 'rocket',
    'RLE': 'snkrle',
};

const DECODE_TIMEOUT = 5000;
const ENCODE_TIMEOUT = 20000;

let worker;
let pending = new Map();
let nextId = 0;

// mdcomp decoders can spin forever or trap on bad input, leaving the worker
// unusable, so it gets thrown away and respawned on the next call
function reset(error) {
    worker?.terminate();
    worker = undefined;
    pending.forEach(({ reject }) => reject(error));
    pending = new Map();
}

function getWorker() {
    if (!worker) {
        worker = new Worker('bundles/compression-worker.js');
        worker.addEventListener('message', ({ data: { id, result, error, fatal } }) => {
            const call = pending.get(id);
            pending.delete(id);
            if (error) call?.reject(new Error(error));
            else call?.resolve(result);
            if (fatal) reset(new Error('compression worker restarted'));
        });
        worker.addEventListener('error', (e) => {
            e.preventDefault();
            reset(new Error(e.message || 'compression worker crashed'));
        });
    }
    return worker;
}

function mdcomp(func, data, timeout) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reset(new Error('timed out')), timeout);
        pending.set(id, {
            resolve: (value) => (clearTimeout(timer), resolve(value)),
            reject: (error) => (clearTimeout(timer), reject(error)),
        });
        getWorker().postMessage({ id, func, data });
    });
}

async function run(direction, buffer, compression, timeout) {
    const operation = compressionFormats[compression];
    try {
        const output = await mdcomp(`_${operation}_${direction}`, buffer, timeout);
        if (!output.length) throw new Error('no output');
        return output;
    } catch (e) {
        throw new Error(`${compression} ${direction} failed: ${e.message}`);
    }
}

export async function decompress(buffer, compression) {
    if (!compressionFormats[compression]) return new Uint8Array(buffer);
    return run('decode', buffer, compression, DECODE_TIMEOUT);
}

export async function compress(buffer, compression) {
    if (!compressionFormats[compression]) return buffer;
    return run('encode', buffer, compression, ENCODE_TIMEOUT);
}
