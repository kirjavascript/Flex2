import { observable, computed, action, makeObservable } from 'mobx';
const { dialog } = require('@electron/remote');
import { errorMsg } from '~/util/dialog';
import { removeBackground } from './remove-background';
import { colorMatch } from './color-match';
import { getSpriteBBoxes, getCanvasBBoxes } from './get-sprite';
import {
    importSprite, planSprite, resetImportCache, commonPixels, padded,
} from './import-sprite';
import { generateInWorker, resetWorkerSession } from './worker-client';
import { environment } from '~/store/environment';
import { workspace } from '~/store/workspace';
import { readFile } from 'fs';
import { storage } from '~/store/storage';

const SHEET_MARGIN = 32;

class ImportState {
    config = {
        active: false,
    };

    bboxes = [];
    sprites = [];
    mappings = [];
    newTileQty = 0;
    // pieces are being worked out, so there is nothing to import yet
    pending = false;
    request = 0;
    type = 'mappings';
    overlap = false;
    alignToArt = false;
    gridAligned = false;
    // one row of square cells, a sprite in each, lined up on the cell centre
    fixedCanvas = false;
    importWidth = 0;
    importHeight = 0;
    spriteIndex = 0;
    paletteLine = 0;
    fuzziness = 4;
    scale = 4;

    reset = () => {
        this.path = undefined;
        this.rotCanvas = undefined;
        this.canvas = undefined;
        this.ctx = undefined;
        this.spriteIndex = 0;
        this.auto = false;
        resetImportCache();
        resetWorkerSession();
        // anything still being generated is for an import that is gone
        this.request++;
        this.pending = false;
        this.bboxes.replace([]);
        this.sprites.replace([]);
        this.mappings.replace([]);
    };

    openImport = (path) => {
        workspace.lastDialogDir = require('path').dirname(path);
        this.path = path;
        this.config.active = true;
    };

    newImport = () => {

        dialog.showOpenDialog({
            title: 'Import Spritesheet',
            properties: ['openFile'],
            defaultPath: workspace.lastDialogDir || undefined,
            filters: [{name: 'Image File', extensions: ['bmp', 'jpg', 'jpeg', 'png', 'gif']}],
        })
            .then(({ filePaths: [path] }) => {
                if (path) this.openImport(path);
            })
            .catch(console.error);
    };

    cancel = () => {
        this.reset();
        this.config.active = false;
    };

    // detect stuff

    canvasRef = (node) => {
        if (!node) return;

        this.canvas = node;
        this.ctx = node.getContext('2d', { willReadFrequently: true });

        if (this.path) {
            readFile(this.path, (_err, data) => {
                if (data) {
                    const blob = new Blob([data]);
                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.onload = () => {
                        node.width = img.width;
                        node.height = img.height;
                        this.ctx.drawImage(img, 0, 0);
                        requestAnimationFrame(this.loaded);
                        URL.revokeObjectURL(url);
                    };
                    img.onerror = (e) => {
                        errorMsg('Import Error', `Error loading ${this.path}`);
                        this.cancel();
                    };
                    img.src = url;
                } else {
                    errorMsg('Import Error', `Error loading ${this.path}`);
                }
            });

        } else if (this.rotCanvas) {
            this.ctx.drawImage(this.rotCanvas, 0, 0);
            requestAnimationFrame(() => {
                this.loaded();
                importState.getBBoxes();
                importState.importSprites();
            });
        }
    };

    loaded = () => {
        const { ctx, canvas } = this;
        const { width, height } = canvas;
        const buffer = ctx.getImageData(0, 0, width, height);
        removeBackground(buffer);
        /*
         * moving the sprite 'fixes' a bug where fuzziness going
         * out of bounds acts as a 'hit' by adding buffer space.
         * has to be at least the size of the max fuzziness (maybe)
         */
        Object.assign(canvas, {
            width: width + SHEET_MARGIN * 2,
            height: height + SHEET_MARGIN * 2,
        });
        ctx.putImageData(buffer, SHEET_MARGIN, SHEET_MARGIN);
        // cells don't depend on what's drawn, so there's nothing to wait for
        if (this.fixedCanvas) this.getBBoxes();
    };

    getBBoxes = () => {
        const { ctx, canvas } = this;
        const { width, height } = canvas;
        const buffer = ctx.getImageData(0, 0, width, height);
        this.bboxes.replace(this.fixedCanvas
            ? getCanvasBBoxes(width, height, SHEET_MARGIN)
            : getSpriteBBoxes(buffer, width, height, this.fuzziness));
    };

    importSprites = () => {
        const sprites = this.bboxes.map(({x, y, width, height}) => {
            return {
                width,
                height,
                buffer: this.ctx.getImageData(x, y, width, height),
                fixed: this.fixedCanvas,
            };
        });

        this.spriteIndex = 0;
        this.sprites.replace(sprites);
    };

    backToDetect = () => {
        this.sprites.replace([]);
    };

    constructor() {
        makeObservable(this, {
            config: observable,
            bboxes: observable,
            sprites: observable,
            // pieces can hold buffers and templates, which must stay as they are
            mappings: observable.shallow,
            newTileQty: observable,
            pending: observable,
            type: observable,
            overlap: observable,
            alignToArt: observable,
            gridAligned: observable,
            fixedCanvas: observable,
            importWidth: observable,
            importHeight: observable,
            spriteIndex: observable,
            paletteLine: observable,
            fuzziness: observable,
            scale: observable,
            reset: action,
            openImport: action,
            newImport: action,
            cancel: action,
            getBBoxes: action,
            importSprites: action,
            backToDetect: action,
            currentSprite: computed,
            tileQty: computed,
            updatePlan: action,
            regenerate: action,
            changePalette: action,
            changeType: action,
            importOne: action,
            importAll: action,
            next: action,
            prev: action
        });
    }

    // import stuff

    get currentSprite() {
        return this.sprites[this.spriteIndex];
    }

    get tileQty() {
        return this.mappings.reduce((a, c) => {
            return a + (c.width * c.height);
        }, 0);
    }

    // tiles are imported into the current bank, so they take its offset too
    get shiftedLine() {
        const bankLine = environment.currentBank?.paletteLine || 0;
        return (this.paletteLine + bankLine + environment.config.artPaletteLine) % 4;
    }

    get options() {
        return { overlap: this.overlap, align: this.alignToArt, grid: this.gridAligned };
    }

    get buffer() {
        const { canvas, ctx } = this;
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // how many tiles are actually new once existing art is reused
    updatePlan = () => {
        const plan = planSprite(this.buffer, this.mappings, this.paletteLine);
        this.newTileQty = plan.newTiles.length;
    };

    // draw the sprite matched to its palette, then work out its pieces. resolves
    // false when another regenerate replaced this one before it finished
    regenerate = () => {
        const { canvas, ctx, type } = this;
        const { buffer } = this.currentSprite;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(colorMatch(buffer, this.shiftedLine), 8, 8);

        // frames of the same size, like monitors, often share a part
        const shared = commonPixels(buffer, this.sprites.map((sprite) => sprite.buffer));
        const common = shared && { keep: padded(shared.keep, buffer.width, buffer.height), share: shared.share };

        const request = ++this.request;
        this.pending = true;
        return generateInWorker(this.buffer, type, this.paletteLine, common, this.options).then((pieces) => {
            if (request !== this.request) return false;
            this.mappings.replace(pieces);
            this.pending = false;
            return true;
        });
    };

    canvasRefImport = (node) => {
        if (!node) return;
        if (this.spriteIndex == -1) {
            this.spriteIndex = 0;
            return;
        }

        this.canvas = node;
        this.ctx = node.getContext('2d', { willReadFrequently: true });
        const { canvas } = this;
        const { width, height } = this.currentSprite;

        canvas.width = this.importWidth = width+16;
        canvas.height = this.importHeight = height+16;

        this.regenerate().then((done) => {
            if (!done) return;
            this.updatePlan();
            if (this.auto) this.importOne();
        });
    };

    // palette and type both change which pieces are best
    changePalette = () => {
        this.regenerate().then((done) => done && this.updatePlan());
    };

    changeType = () => {
        this.regenerate().then((done) => done && this.updatePlan());
    };

    importOne = () => {
        if (this.pending) return;
        const { mappings, paletteLine, currentSprite: { fixed, width, height } } = this;
        // the import canvas pads the sprite by 8px
        const origin = fixed ? { x: 8 + Math.floor(width / 2), y: 8 + Math.floor(height / 2) } : undefined;
        importSprite(this.buffer, mappings, paletteLine, { select: !this.auto, origin });
        this.next();
    };

    importAll = () => {
        this.auto = true;
        this.spriteIndex = -1;
    };

    next = () => {
        if (this.spriteIndex < this.sprites.length-1) {
            this.spriteIndex++;
        }
        else {
            if (this.auto) environment.config.currentSprite = environment.mappings.length - 1;
            this.cancel();
        }
    };

    prev = () => {
        if (this.spriteIndex > 0) {
            this.spriteIndex--;
        }
    };
}

const importState = new ImportState();
storage(importState, 'import-state', [
    'fuzziness', 'scale', 'fixedCanvas', 'type', 'overlap', 'gridAligned', 'alignToArt',
]);
export { importState };
