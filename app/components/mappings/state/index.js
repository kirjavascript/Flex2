import { observable, computed, action, makeObservable, observe } from 'mobx';
import { environment } from '#store/environment';
import clamp from 'lodash/clamp';
import { getCenter } from './bounds';
import { placeNewMapping } from './place-new-mapping';
import { optimizeCurrentDPLCs } from './optimize-dplcs';
import { deleteUnusedTiles } from './delete-unused-tiles';
import { toggleDPLCs } from './toggle-dplcs';
import { arrangeTilesBySpriteOrder } from './arrange-tiles-by-sprite-order';
import { storage } from '#store/storage';

class MappingState {
    // viewing

    baseWidth = 600;
    scale = 4;
    x = 300;
    y = 300;

    resetPanAndZoom = () => {
        this.setZoom(4);
        this.x = 0|(this.baseWidth / 2);
        this.y = 300;
    };

    setWidth = (width) => {
        this.baseWidth = width;
        this.x = (width / 2)|0;
        this.y = 300;
    };

    setZoom = (newScaleRaw) => {
        if (this.newMapping.piece) return;
        const newScale = clamp(newScaleRaw, 1, 20);
        // adjust guidelines
        const { x, y } = this.guidelines;
        this.guidelines.y = (y / this.scale) * newScale;
        this.guidelines.x = (x / this.scale) * newScale;
        // set scale
        this.scale = newScale;
    };

    // drawing mode

    drawIndexLeft = 1;
    drawIndexRight = 0;
    drawPalette = 0;
    mode = 'mapping';

    toggleMode = () => {
        this.mode = this.mode == 'mapping' ? 'drawing' : 'mapping';
    };

    // guidelines

    guidelines = {
        x: 0, y: 0, enabled: false,
    };

    constructor() {
        makeObservable(this, {
            baseWidth: observable,
            scale: observable,
            x: observable,
            y: observable,
            resetPanAndZoom: action,
            setWidth: action,
            setZoom: action,
            drawIndexLeft: observable,
            drawIndexRight: observable,
            drawPalette: observable,
            mode: observable,
            toggleMode: action,
            guidelines: observable,
            guidelinesAbs: computed,
            selectedIndices: observable,
            select: observable,
            move: observable,
            selectBBox: computed,
            selectAll: action,
            selectNone: action,
            selectToggle: action,
            rotate: observable,
            toggleRotate: action,
            rawEditor: observable,
            toggleRawEditor: action,
            newMapping: observable,
            toggleNewMapping: action,
            autodismiss: observable,
            toggleAutodismiss: action,
            placeNewMapping: action,
            activeMappings: computed,
            hasActive: computed,
            mutateActive: action,
            center: computed,
            optimizeCurrentDPLCs: action,
            deleteUnusedTiles: action,
            toggleDPLCs: action,
            arrangeTilesBySpriteOrder: action
        });

        // ensure only one modal is open at once
        const modals = ['newMapping', 'rawEditor', 'rotate'];
        modals.forEach(modal => {
            observe(this[modal], value => {
                if (value.name === 'active' && value.object.active) {
                    modals.forEach(otherModal => {
                        if (otherModal !== modal) {
                            this[otherModal].active = false;
                        }
                    });
                }
            });
        });
    }

    get guidelinesAbs() {
        return {
            x: this.guidelines.x + this.x,
            y: this.guidelines.y + this.y,
        };
    }

    // selections

    selectedIndices = [];

    select = {
        active: false,
        x0: 0, y0: 0,
        x1: 0, y1: 0,
    };

    move = {
        active: false,
        init: [],
        x: 0, y: 0,
    };

    get selectBBox() {
        const { active, x0, x1, y0, y1 } = this.select;
        if (active) {
            return {
                x: Math.min(x0, x1),
                y: Math.min(y0, y1),
                width: Math.abs(x0 - x1),
                height: Math.abs(y0 - y1),
            };
        }
        else {
            return undefined;
        }
    }

    selectAll = () => {
        if (this.move.active) return;
        const indices = environment.currentSprite.mappings.map((d, i) => i);
        this.selectedIndices.replace(indices);
    };

    selectNone = () => {
        if (this.move.active) return;
        this.selectedIndices.replace([]);
    };

    selectToggle = (index) => {
        if (this.move.active) return;
        if (~this.selectedIndices.indexOf(index)) {
            this.selectedIndices.replace(this.selectedIndices.filter((i) => {
                return i != index;
            }));
        }
        else {
            this.selectedIndices.push(index);
        }
    };

    // rotate

    rotate = {
        angle: 0,
        active: false,
    };

    toggleRotate = () => {
        this.rotate.active = !this.rotate.active;
    };

    // raw editor

    rawEditor = {
        active: false,
    };

    toggleRawEditor = () => {
        this.rawEditor.active = !this.rawEditor.active;
    };

    // new mappings

    newMapping = {
        active: false,
        piece: undefined,
    };

    toggleNewMapping = () => {
        this.newMapping.active = !this.newMapping.active;
    };

    autodismiss = true;

    toggleAutodismiss = () => {
        this.autodismiss = !this.autodismiss
    };

    placeNewMapping = placeNewMapping;

    // active mappings

    get activeMappings() {
        return this.selectedIndices.reduce((a, c) => {
            const { mappings } = environment.currentSprite;
            if (mappings.length > c) {
                a.push(mappings[c]);
            }
            return a;
        }, []);
    }

    get hasActive() {
        return !!this.activeMappings.length;
    }

    mutateActive = (callback) => {
        if (!this.hasActive) return;
        this.activeMappings.forEach(callback);
    };

    get center() {
        if (!this.activeMappings.length) return;

        return getCenter(this.activeMappings);
    }

    // imported stuff

    optimizeCurrentDPLCs = optimizeCurrentDPLCs;
    deleteUnusedTiles = deleteUnusedTiles;
    toggleDPLCs = toggleDPLCs;
    arrangeTilesBySpriteOrder = arrangeTilesBySpriteOrder;
}

const mappingState = new MappingState();
storage(mappingState, 'mapping-state', ['autodismiss']);
export { mappingState };
