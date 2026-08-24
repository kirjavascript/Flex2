import { constants } from './run-script';
import { frameKey } from './write-bin';
import { logger } from './debug';

export function makeOffsetTable({ read, write }) {
    return (size = constants.dc.w, { items, tables } = {}) => [
        ({ getCursor }) => ({ ref }) => {
            const cursor = getCursor();
            const mask = (2 ** (size - 1)) - 1; // 0x7FFF for dc.w
            if (tables === 'auto') {
                return readTables({ ref, getCursor, cursor, mask, size, read });
            }
            if (!ref.global.ptr) {
                ref.global.ptr = mask;
            }
            const headers = [];
            // we keep searching for headers until either;
            // - cursor reaches a header pointer value
            // - items is exceeded
            for (let i = cursor; i < 1e5 && i < ref.global.ptr; i = getCursor()) {
                const header = (read(size) & mask) + cursor;
                headers.push(header);
                logger('= HEADER =', header);
                if (header < ref.global.ptr && !(header === 0)) {
                    ref.global.ptr = header;
                }
                if (items && headers.length >= items) break;
            }
            ref.global.headers = (ref.global.headers || []).concat(headers);
            pushSpriteCleanup(ref, headers.map((header) => ({ header, table: 0 })));
            return constants.endSection;
        },
        ({ ref, sprite }, spriteIndex) => {
            const spriteTables = ref.global.spriteTables || (ref.global.spriteTables = []);
            // a sprite is in the table of the last sprite tagged before it
            const tag = sprite.metadata?.table;
            spriteTables[spriteIndex] = tag == null || tag === ''
                ? (spriteTables[spriteIndex - 1] || 0)
                : Number(tag) || 0;

            if (spriteIndex === 0) {
                ref.global.cleanup.push(({ sections }) => {
                    const [header, mappings] = sections;

                    // every table's offsets are relative to its own first entry
                    const tableBase = [];
                    spriteTables.forEach((table, i) => {
                        if (tableBase[table] == null) {
                            tableBase[table] = (size / 8) * i;
                        } else if (spriteTables[i - 1] !== table) {
                            throw new Error(
                                `sprites of table ${table} must be next to each other (sprite ${i})`,
                            );
                        }
                    });

                    let cursor = size * mappings.length; // bits
                    // the same bytes are only written once and pointed at as
                    // many times as they are used, which is how a ROM holds
                    // them - the ASM writers work from the listing itself, so
                    // the packed layout is handed to writeBIN on the side
                    let packed = cursor;
                    const shared = new Map();
                    const packedHeader = [];
                    const packedFrames = [];

                    mappings.forEach((frames, i)=> {
                        const base = tableBase[spriteTables[i]];
                        const addr = header[i];
                        const entry = addr.slice();
                        addr.push([[constants.address, size, (cursor / 8) - base]]);

                        const key = frames.length && frameKey(frames);
                        if (key && shared.has(key)) {
                            entry.push([[constants.address, size, shared.get(key) - base]]);
                        } else {
                            const at = packed / 8;
                            if (key) shared.set(key, at);
                            entry.push([[constants.address, size, at - base]]);
                            packedFrames.push(frames);
                            frames.forEach(frame => {
                                frame.forEach(([, size]) => {
                                    packed += size;
                                });
                            });
                        }
                        packedHeader.push(entry);

                        frames.forEach(frame => {
                            frame.forEach(([, size]) => {
                                cursor += size;
                            });
                        });
                    });

                    sections.layout = [packedHeader, packedFrames];
                });
            }
        },
    ];
}

/**
 * Reads any number of tables sitting next to each other, each one holding
 * offsets from its own first entry (S3K's normal + super player frames).
 *
 * The tables end where the frames they point at begin, so the first entry
 * marks the end of the table area. Which entry belongs to which table can
 * only be told apart once the frames are known, so that runs as cleanup:
 * the tables are the same length, so we take the fewest equal splits where
 * every entry lands on the start of a frame.
 */
function readTables({ ref, getCursor, cursor, mask, size, read }) {
    const offsets = [];
    let poolStart = mask;

    for (let i = cursor; i < 1e5 && i < poolStart; i = getCursor()) {
        const offset = read(size) & mask;
        if (!offsets.length) {
            poolStart = offset + cursor;
        }
        offsets.push(offset);
    }

    markFirstHeader(ref);
    ref.global.cleanup.push((args) => {
        const { spritesAddr, buffer } = args;

        const split = (count) => {
            const per = offsets.length / count;
            return offsets.map((offset, i) => {
                const table = Math.floor(i / per);
                const tableAddr = cursor + (per * table * (size / 8));
                return { header: offset + tableAddr, table, tableAddr };
            });
        };
        const resolves = ({ header }) =>
            header === 0 || spritesAddr[header] || buffer[header] === 0;

        let headers = split(1);
        for (let count = 1; count <= 8; count++) {
            if (offsets.length % count) continue;
            const candidate = split(count);
            if (candidate.every(resolves)) {
                logger('= TABLES =', count);
                headers = candidate;
                break;
            }
        }

        ref.global.headers = (ref.global.headers || []).concat(
            headers.map(({ header }) => header),
        );
        resolveSprites(args, headers);
    });

    return constants.endSection;
}

// the frames read after the tables are replaced by the ones the tables point at
function markFirstHeader(ref) {
    if (!ref.global.firstHeader) {
        ref.global.firstHeader = true;
        ref.global.cleanup.push(({ sprites, spriteTables, spriteTableAddrs }) => {
            sprites.splice(0, sprites.length);
            spriteTables.splice(0, spriteTables.length);
            spriteTableAddrs.splice(0, spriteTableAddrs.length);
        });
    }
}

function pushSpriteCleanup(ref, headers) {
    markFirstHeader(ref);
    ref.global.cleanup.push((args) => resolveSprites(args, headers));
}

function resolveSprites({ sprites, spriteTables, spriteTableAddrs, spritesAddr, buffer }, headers) {
    headers.forEach(({ header, table, tableAddr = 0 }) => {
        const push = (sprite) => {
            sprites.push(sprite);
            spriteTables.push(table);
            spriteTableAddrs.push(tableAddr);
        };
        if (header === 0) {
            push([]);
        } else if (spritesAddr[header]) {
            push(spritesAddr[header]);
        } else if (buffer[header] === 0) {
            push([]);
        } else {
            logger('error', 'no sprite at ' + header);
        }
    });
}
