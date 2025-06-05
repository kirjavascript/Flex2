import * as Comlink from 'comlink';

export const compressionFormats = {
    'Uncompressed': undefined,
    'Nemesis': 'nemesis',
    'Kosinski': 'kosinski',
    'Kosinski-M': 'moduled_kosinski',
    'KosinskiPlus': 'kosplus',
    'KosinskiPlus-M': 'moduled_kosplus',
    'Comper': 'comper',
    'Enigma': 'enigma',
    'ArtC42': 'artc42',
    'LZKN1': 'lzkn1',
    'Rocket': 'rocket',
    'RLE': 'snkrle',
};

const worker = Comlink.wrap(new Worker('bundles/compression-worker.js'));

export async function decompress(buffer, compression) {
    const operation = compressionFormats[compression];

    if (!operation) return new Uint8Array(buffer);
    else return await worker.mdcomp(`_${operation}_decode`, buffer);

}

export async function compress(buffer, compression) {
    const operation = compressionFormats[compression];

    if (!operation) return buffer;
    else return await worker.mdcomp(`_${operation}_encode`, buffer);
}
