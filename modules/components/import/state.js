import { observable, computed, action, autorun, toJS } from 'mobx';
import { environment } from '#store/environment';
const { dialog } = require('electron').remote;
import { errorMsg } from '#util/dialog';
import { closest } from 'color-diff';

class ImportState {

    @observable config = {
        active: false,
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

    reset = () => {
        this.path = void 0;
        this.canvas = void 0;
        this.ctx = void 0;
    };

    canvasRef = (node) => {
        if (!node) return this.reset();

        this.canvas = node;
        this.ctx = node.getContext('2d');

        const img = new Image();

        img.onload = () => {
            node.width = img.width;
            node.height = img.height;
            this.ctx.drawImage(img, 0, 0);
            this.loaded();
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

        // get top left pixel
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        // strip background colour
        if (a > 0x80) {
            for (let i = 0, j = 0; i < (width * height); i++, j+=4) {
                if (
                    r == buffer.data[j] &&
                    g == buffer.data[j+1] &&
                    b == buffer.data[j+2]
                ) {
                    buffer.data[j+3] = 0;
                }
            }
            ctx.putImageData(buffer, 0, 0);
        }

        // color matching
        const colorConvert = this.nearestColor();
        for (let i = 0, j = 0; i < (width * height); i++, j+=4) {
            if (buffer.data[j+3] != 0) {
                const {R, G, B} = colorConvert({
                    R: buffer.data[j],
                    G: buffer.data[j+1],
                    B: buffer.data[j+2],
                });
                buffer.data[j] = R;
                buffer.data[j+1] = G;
                buffer.data[j+2] = B;
            }
        }
        ctx.putImageData(buffer, 0, 0);

    };

    nearestColor = (line = 0) => {
        const palette = environment.palettesRGB[line]
            .slice(1) // ignore transparency
            .map(([R, G, B]) => ({R, G, B}));

        const cache = [];

        return (color) => {
            const preCalculated = cache.find((obj) => (
                obj.color.R == color.R &&
                obj.color.G == color.G &&
                obj.color.B == color.B
            ));

            if (preCalculated) {
                return preCalculated.result;
            }
            else {
                const result = closest(color, palette);

                cache.push({color, result});

                return result;
            }
        };
    };

}

// export/import sprite sheet (load raw image -> option to load palette) image importing nearest match (color approx)

// choose palette line ( auto update)
// fill bg?
// generate palette

const importState = new ImportState();
export { importState };
