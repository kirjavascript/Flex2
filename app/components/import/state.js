import { observable, computed, action, autorun, toJS, makeObservable } from 'mobx';
const { dialog } = require('@electron/remote');
import { errorMsg } from '#util/dialog';
import { removeBackground } from './remove-background';
import { colorMatch } from './color-match';
import { getSpriteBBoxes } from './get-sprite';
import { getMappings } from './generate-mappings';
import { importSprite } from './import-sprite';

class ImportState {
    config = {
        active: false,
    };

    bboxes = [];
    sprites = [];
    mappings = [];
    type = 'mappings';
    importWidth = 0;
    importHeight = 0;
    spriteIndex = 0;
    paletteLine = 0;
    fuzziness = 4;
    scale = 4;

    reset = () => {
        this.path = undefined;
        this.canvas = undefined;
        this.ctx = undefined;
        this.spriteIndex = 0;
        this.auto = false;
        this.bboxes.replace([]);
        this.sprites.replace([]);
        this.mappings.replace([]);
    };

    newImport = () => {

        dialog.showOpenDialog({
            title: 'Import Spritesheet',
            properties: ['openFile'],
            filters: [{name: 'Image File', extensions: ['bmp', 'jpg', 'jpeg', 'png', 'gif']}],
        })
            .then(({ filePaths: [path] }) => {
                if (path) {
                    this.path = path;
                    this.config.active = true;
                }
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
        this.ctx = node.getContext('2d');

        if (this.path) {
            const img = new Image();

            img.onload = () => {
                node.width = img.width;
                node.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                requestAnimationFrame(this.loaded);
            };

            img.onerror = (e) => {
                errorMsg('Import Error', `Error loading ${this.path}`);
                this.cancel();
            };

            img.src = this.path;

        } else if (this.rotCanvas) {
            this.ctx.drawImage(this.rotCanvas, 0, 0);
            delete this.rotCanvas;
            requestAnimationFrame(() => {
                this.loaded();
                importState.getBBoxes();
                importState.importSprites();
                importState.importAll();
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
            width: width+64,
            height: height+64,
        });
        ctx.putImageData(buffer, 32, 32);
    };

    getBBoxes = () => {
        const { ctx, canvas } = this;
        const { width, height } = canvas;
        const buffer = ctx.getImageData(0, 0, width, height);
        this.bboxes.replace(
            getSpriteBBoxes(buffer, width, height, this.fuzziness)
        );
    };

    importSprites = () => {
        const { ctx, canvas } = this;
        const { width, height } = canvas;
        const buffer = ctx.getImageData(0, 0, width, height);
        const sprites = this.bboxes.map(({x, y, width, height}) => {
            return {
                width,
                height,
                buffer: ctx.getImageData(x, y, width, height),
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
            mappings: observable,
            type: observable,
            importWidth: observable,
            importHeight: observable,
            spriteIndex: observable,
            paletteLine: observable,
            fuzziness: observable,
            scale: observable,
            reset: action,
            newImport: action,
            cancel: action,
            getBBoxes: action,
            importSprites: action,
            backToDetect: action,
            currentSprite: computed,
            tileQty: computed,
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

    canvasRefImport = (node) => {
        if (!node) return;
        if (this.spriteIndex == -1) {
            this.spriteIndex = 0;
            return;
        }

        this.canvas = node;
        this.ctx = node.getContext('2d');
        const { canvas, ctx, type } = this;
        const { width, height, buffer } = this.currentSprite;

        canvas.width = this.importWidth = width+16;
        canvas.height = this.importHeight = height+16;

        // draw sprite
        const coloredBuffer = colorMatch(buffer, this.paletteLine);
        ctx.putImageData(coloredBuffer, 8, 8);

        this.mappings.replace(getMappings(canvas, ctx, type));

        if (this.auto) {
            requestAnimationFrame(() => {
                this.importOne();
            });
        }
    };

    changePalette = () => {
        const { canvas, ctx } = this;
        const { width, height, buffer } = this.currentSprite;
        const coloredBuffer = colorMatch(buffer, this.paletteLine);
        ctx.putImageData(coloredBuffer, 8, 8);
    };

    changeType = () => {
        const { canvas, ctx, type } = this;
        this.mappings.replace(getMappings(canvas, ctx, type));
    };

    importOne = () => {
        const { ctx, mappings, paletteLine } = this;
        importSprite(ctx, mappings, paletteLine);
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
export { importState };
