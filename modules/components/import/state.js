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

        // get top left pixel
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        // strip background colour
        if (a > 0x80) {
            // tfw lambdas are five times slower than a for loop...
            for (let i = 0, j = 0; i < (width * height); i++, j+=4) {
                if (
                     r == buffer.data[j] &&
                     g == buffer.data[j+1] &&
                     b == buffer.data[j+2]
                 ) {
                    buffer.data[j+3] = 0;
                }
            }
        }

        // color matching
        const colorConvert = nearestColor();
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

        // get bboxes

        function getXY(pos) {
            const x = (pos / 4) % width;
            const y = (((firstPos / 4) - x) / width);
            return [x, y];
        }

        function getPos(x, y) {
            return ((y * width) + x) * 4;
        }

        function setPixel(pos) {
            buffer.data[pos+3] = 0;
            // track x/y here
        }

        function checkMatch(pos) {
            return buffer.data[pos+3] !== 0;
        }

        // get first pixel
        let firstPos = -1;

        for (let i = 0, j = 0; i < (width * height); i++, j+=4) {
            if (buffer.data[j+3] > 0x80) {
                firstPos = j;
                break;
            }
        }

        // if no pixels found...
        if (firstPos == -1) return;

        let [x, y] = getXY(firstPos);


        let stack = [[x, y]];

        while (stack.length) {
            let reachLeft, reachRight;
            let [x, y] = stack.pop();
            let pos = getPos(x, y);

            while (y-- >= 0 && checkMatch(pos)) {
                pos -= width * 4;
            }

            pos += width * 4;
            ++y;
            reachLeft = false;
            reachRight = false;

            if (stack.length > 100000) return;

            while (y++ < height - 1 && checkMatch(pos)) {
                setPixel(pos);

                if (x > 0) {
                    if (checkMatch(pos-4)) {
                        if (!reachLeft) {
                            stack.push([x - 1, y]);
                            reachLeft = true;
                        }
                    }
                    else if (reachLeft) {
                        reachLeft = false;
                    }
                }

                if (x < width - 1) {
                    if (checkMatch(pos+4)) {
                        if (!reachRight) {
                            stack.push([x + 1, y]);
                            reachRight = true;
                        }
                    }
                    else if (reachRight) {
                        reachRight = false;
                    }
                }

                pos += width * 4;
            }

        }


        ctx.putImageData(buffer, 0, 0);

        // ctx.fillStyle = 'green';
        // ctx.fillRect(10, 10, 100, 100);

    };

}

function nearestColor(line = 0) {
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
}

//start from top left
//mappings dont have to be in a grid
//https://github.com/sonicretro/SonLVL/blob/master/SpritePlotter.NET/Program.cs#L324
// generate palette: npm splashy
//
// place smallest (yet largest) mapping possible in middle based on w/h

// extract bbox into its own new canvas layer

// get bbox -> packing algorithm -> remove empty maps -> shrink where possible
//
// bbox: find first pixel -> flood fill non transparent -> trackx/y for bbox

const importState = new ImportState();
export { importState };
