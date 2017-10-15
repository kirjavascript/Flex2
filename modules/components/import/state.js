import { observable, computed, action, autorun, toJS } from 'mobx';
const { dialog } = require('electron').remote;
import { errorMsg } from '#util/dialog';
import { removeBackground } from './remove-background';
import { colorMatch } from './color-match';
import { getSpriteBBoxes } from './get-sprite';
import { getMappings } from './generate-mappings';

class ImportState {

    @observable config = {
        active: false,
    };

    @observable bboxes = [];
    @observable sprites = [];
    @observable mappings = [];
    @observable type = 'mappings';
    @observable importWidth = 0;
    @observable importHeight = 0;
    @observable spriteIndex = 0;
    @observable paletteLine = 0;
    @observable fuzziness = 4;
    @observable scale = 4;

    @action reset = () => {
        this.path = void 0;
        this.canvas = void 0;
        this.ctx = void 0;
        this.spriteIndex = 0;
        this.bboxes.replace([]);
        this.sprites.replace([]);
        this.mappings.replace([]);
    };

    @action newImport = () => {

        dialog.showOpenDialog({
            title: 'Import Spritesheet',
            properties: ['openFile'],
            filters: [{name: 'Image File', extensions: ['bmp', 'jpg', 'jpeg', 'png', 'gif']}],
        }, (paths) => {
            if (paths) {
                const [path] = paths;

                this.path = path;
                this.config.active = true;
            }
        });
    };

    @action cancel = () => {
        this.reset();
        this.config.active = false;
    };

    // detect stuff

    canvasRef = (node) => {
        if (!node) return;

        this.canvas = node;
        this.ctx = node.getContext('2d');

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
    };

    loaded = () => {
        const { ctx, canvas } = this;
        const { width, height } = canvas;
        const buffer = ctx.getImageData(0, 0, width, height);
        removeBackground(buffer);
        ctx.putImageData(buffer, 0, 0);
    };

    @action getBBoxes = () => {
        const { ctx, canvas } = this;
        const { width, height } = canvas;
        const buffer = ctx.getImageData(0, 0, width, height);
        this.bboxes.replace(
            getSpriteBBoxes(buffer, width, height, this.fuzziness)
        );
    };

    @action importSprites = () => {
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

        this.sprites.replace(sprites);
    };

    // import stuff

    @computed get currentSprite() {
        return this.sprites[this.spriteIndex];
    }

    canvasRefImport = (node) => {
        if (!node) return;
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
    };

    @action changePalette = () => {
        const { canvas, ctx } = this;
        const { width, height, buffer } = this.currentSprite;
        const coloredBuffer = colorMatch(buffer, this.paletteLine);
        ctx.putImageData(coloredBuffer, 8, 8);
    };

    @action changeType = () => {
        const { canvas, ctx, type } = this;
        this.mappings.replace(getMappings(canvas, ctx, type));
    }

    @action importOne = () => {

    };

    @action importAll = () => {
        // animate fast
        // set index to 0
        // set flag to check in canvas ref

    };

    @action next = () => {
        if (this.spriteIndex < this.sprites.length-1) {
            this.spriteIndex++;
        }
        // else deactivate
    };

    @action prev = () => {
        if (this.spriteIndex > 0) {
            this.spriteIndex--;
        }
    };

}

const importState = new ImportState();
export { importState };

// generate palette: npm splashy
//

// 22:58:28 <%snkenjoi> so, present each sprite for adjustment
// 22:58:40 < flamewing> I think that would be a good compromise, yeah
// 22:59:14 <%snkenjoi> because it sounds otherwise this is going to be a bit hellish :)
//
// 22:59:26 < flamewing> *If* the UI makes it very easy to change the resulting split
//
// 22:37:07 < flamewing> Minimum number of tiles, minimum number of sprite pieces, minimum number of sprite pieces per scanline, and so on
//
// 22:46:55 < flamewing> For example: starting by making tile rows that cover the image with minimal slack, and are hugging the top-left of the image as much as possible; then shift lines 1 pixel at a time, adding
//                      tiles (and removing blank tiles) as needed, and trying to merge into sprites. Then shift the initial cover up by 1 pixel and add/remove tiles as needed; repeat. You never need to shift each
//                      line by more than 7 pixels, and you don't need to shift the cover
// 22:46:56 < flamewing> vertically by more than 7 pixels
// 22:48:35 < flamewing> It is probably not fast, but you can probably put some bounds, and maybe refine by trying to keep similarly-sized rows of tiles in lock-step
// 22:48:44 <%snkenjoi> the merging is the tricky part
// 22:48:56 <%snkenjoi> I think?
// 22:49:06 <%snkenjoi> actually maybe not
// 22:49:10 >>  Techokami!Techokami@bdnk-8238933a.fios.verizon.net has joined: #SSRG
// 22:49:28 < djohe> flamewing you got an IRC PM
// 22:49:39 < flamewing> When doing the sliding, you can probably do a compressed bitmap version with a single bit per tile
// 22:50:21 < flamewing> And maybe with a whole lot of analysis, maybe even do some large lookup tables
