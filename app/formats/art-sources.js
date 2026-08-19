import { toJS } from 'mobx';

// An object's art can come from more than one file. Each is loaded into its own
// bank of tiles at an address, so a bank reaches exactly as far as the tiles it
// holds: nothing infers, remembers or measures where one ends.

// sources in load order, one bank each. disabled ones are still loaded so they
// can be switched back on without a reload. `extraIndex` points back at
// art.extra so callers can write to the source they came from
export function artSources(art) {
    const { extra, ...first } = toJS(art) || {};
    return [
        { ...first, extraIndex: -1 },
        ...(extra || []).map((source, extraIndex) => ({ ...source, extraIndex })),
    ];
}

export const number = (value) => (value === '' || value == null ? null : Number(value));

// a bad address would put a bank somewhere nothing can reach, so it stops IO
export function validateArtSources(art) {
    artSources(art).forEach((source) => {
        if (source.extraIndex < 0) return;

        const address = number(source.address);
        if (address == null) return;

        if (!Number.isInteger(address) || address < 0) {
            throw new Error(
                `Extra art ${source.extraIndex + 1} (${source.path}): `
                + `tile address must be a whole number 0 or more, got ${address}`,
            );
        }
    });
}

export function sameTiles(a, b) {
    return a.length === b.length
        && a.every((tile, i) => tile.length === b[i].length
            && tile.every((pixel, p) => pixel === b[i][p]));
}
