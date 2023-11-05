import { constants } from './run-script';
import { logger } from './debug';

export function makeOffsetTable({ read, write }) {
    return (size = constants.dc.w, { items } = {}) => [
        ({ getCursor }) => ({ ref }) => {
            const cursor = getCursor();
            const mask = (2 ** (size - 1)) - 1; // 0x7FFF for dc.w
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
            if (!ref.global.firstHeader) {
                ref.global.firstHeader = true;
                ref.global.cleanup.push(({ sprites }) => {
                    sprites.splice(0, sprites.length);
                });
            }
            ref.global.cleanup.push(({ sprites, spritesAddr }) => {
                headers.forEach(header => {
                    if (header === 0) {
                        sprites.push([]); // handle zero header optimization
                    } else {
                        if (spritesAddr[header]) {
                            sprites.push(spritesAddr[header]);
                        } else {
                            logger('error', 'no sprite at ' + header);
                        }
                    }
                });
            });
            return constants.endSection;
        },
        ({ ref }, spriteIndex) => {
            if (spriteIndex === 0) {
                ref.global.cleanup.push(({ sections }) => {
                    const [header, mappings] = sections;

                    let cursor = size * mappings.length; // bits

                    mappings.forEach((frames, i)=> {
                        const addr = header[i];
                        addr.push([[address, size, cursor / 8]]);

                        frames.forEach(frame => {
                            frame.forEach(([, size]) => {
                                cursor += size;
                            });
                        });
                    });

                });
            }
        },
    ];
}
