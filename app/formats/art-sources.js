import { toJS } from 'mobx';

// An object's art can come from more than one file, each loaded at its own tile
// base. Sprites from `fromSprite` onwards index their art relative to that
// file, exactly like S3K's Sonic_Load_PLC swapping to ArtUnc_Sonic_Extra for
// frames >= $DA. Indices are absolute while loaded and rebased on save.

// sources are listed in load order, disabled ones dropped. `extraIndex` points
// back at art.extra so callers can write to the source they came from
export function artSources(art) {
    const { extra, ...first } = toJS(art) || {};
    return [
        { ...first, extraIndex: -1 },
        ...(extra || [])
            .map((source, extraIndex) => ({ ...source, extraIndex }))
            .filter((source) => source.enabled !== false),
    ];
}

export function hasExtraArt(art) {
    return Boolean(art && art.extra && art.extra.some((s) => s.enabled !== false));
}

export const number = (value) => (value === '' || value == null ? null : Number(value));

// a bad number here silently corrupts art (slices running backwards) or
// mappings (a fromSprite below 0 rebases every sprite), so it stops IO instead
export function validateArtSources(art) {
    artSources(art).forEach((source) => {
        if (source.extraIndex < 0) return;
        const name = `Extra art ${source.extraIndex + 1} (${source.path})`;

        const check = (field, value, min) => {
            if (value == null) return;
            if (!Number.isInteger(value) || value < min) {
                throw new Error(`${name}: ${field} must be a whole number ${min} or more, got ${value}`);
            }
        };

        const base = number(source.base);
        const fromSprite = number(source.fromSprite);

        check('tile base', base, 0);
        check('tile length', number(source.length), 1);
        check('from sprite', fromSprite, 0);

        // rebasing every sprite is never what this field is for, and reads the
        // same as leaving it off. blank is the way to say "don't rebase"
        if (fromSprite === 0 && base) {
            throw new Error(
                `${name}: from sprite 0 would rebase every sprite by ${base}. `
                + 'Leave it blank to load this art without rebasing',
            );
        }
    });
}

// how many tiles each file gave us last load, so save can tell when a source
// would be written back shorter than it came in
const loadedSizes = new Map();

export function rememberLoadedSize(path, tiles) {
    loadedSizes.set(path, tiles);
}

export function loadedSize(path) {
    return loadedSizes.has(path) ? loadedSizes.get(path) : null;
}

// several tables can share one frame numbering, so `fromSprite` counts from the
// start of the sprite's own table
function tableRelativeIndices(spriteMetadata, spriteCount) {
    const indices = [];
    let table = null;
    let start = 0;

    for (let i = 0; i < spriteCount; i++) {
        const tag = toJS(spriteMetadata[i])?.table;
        if (tag != null && tag !== '') {
            const current = Number(tag) || 0;
            if (current !== table) {
                table = current;
                start = i;
            }
        }
        indices.push(i - start);
    }

    return indices;
}

export function spriteArtBases(art, spriteMetadata = [], spriteCount = 0) {
    const extra = hasExtraArt(art)
        ? artSources(art)
              .slice(1)
              .map((source) => ({
                  base: number(source.base),
                  fromSprite: number(source.fromSprite),
              }))
              .filter(({ base, fromSprite }) => base != null && fromSprite != null)
        : [];

    // nothing to rebase: callers keep their observable data as-is
    if (!extra.length) return null;

    const relative = tableRelativeIndices(spriteMetadata, spriteCount);

    return (spriteIndex) => {
        let base = 0;
        extra.forEach((source) => {
            if (relative[spriteIndex] >= source.fromSprite) base = source.base;
        });
        return base;
    };
}

// art indices live absolute in the editor, relative to their source on disk
export function rebaseSprites(sprites, artBase, sign) {
    if (!artBase) return sprites;

    return sprites.map((sprite, spriteIndex) => {
        const base = artBase(spriteIndex) * sign;
        if (!base) return toJS(sprite);
        return toJS(sprite).map((entry) => ({ ...entry, art: entry.art + base }));
    });
}
