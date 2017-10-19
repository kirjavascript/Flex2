import { observable, computed, action, autorun, toJS } from 'mobx';
import { environment } from '#store/environment';
import clamp from 'lodash/clamp';
import { getCenter } from '#util/get-center';
import { placeNewMapping } from './place-new-mapping';
import { deleteUnusedDPLCs } from './delete-unused-dplcs';
import { deleteUnusedTiles } from './delete-unused-tiles';
import { toggleDPLCs } from './toggle-dplcs';

class MappingState {

    // viewing

    @observable baseWidth = 600;
    @observable scale = 4;
    @observable x = 300;
    @observable y = 300;

    @action resetPanAndZoom = () => {
        this.setZoom(4);
        this.x = 0|(this.baseWidth / 2);
        this.y = 300;
    };

    @action setWidth = (width) => {
        this.baseWidth = width;
        this.x = (width / 2)|0;
        this.y = 300;
    };

    @action setZoom = (newScaleRaw) => {
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

    @observable drawIndexLeft = 1;
    @observable drawIndexRight = 0;
    @observable drawPalette = 0;
    @observable mode = 'mapping';

    @action toggleMode = () => {
        this.mode = this.mode == 'mapping' ? 'drawing' : 'mapping';
    };

    // guidelines

    @observable guidelines = {
        x: 0, y: 0, enabled: false,
    };

    @computed get guidelinesAbs() {
        return {
            x: this.guidelines.x + this.x,
            y: this.guidelines.y + this.y,
        };
    }

    // selections

    @observable selectedIndicies = [];

    @observable select = {
        active: false,
        x0: 0, y0: 0,
        x1: 0, y1: 0,
    };

    @observable move = {
        active: false,
        init: [],
        x: 0, y: 0,
    }

    @computed get selectBBox() {
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
            return void 0;
        }
    }

    @action selectAll = () => {
        const indicies = environment.currentSprite.mappings.map((d, i) => i);
        this.selectedIndicies.replace(indicies);
    };

    @action selectNone = () => {
        this.selectedIndicies.replace([]);
    };

    @action selectToggle = (index) => {
        if (~this.selectedIndicies.indexOf(index)) {
            this.selectedIndicies.replace(this.selectedIndicies.filter((i) => {
                return i != index;
            }));
        }
        else {
            this.selectedIndicies.push(index);
        }
    };

    // raw editor

    @observable rawEditor = {
        active: false,
    };

    // new mappings

    @observable newMapping = {
        active: false,
        piece: void 0,
    };

    @action placeNewMapping = placeNewMapping;

    // active mappings

    @computed get activeMappings() {
        return this.selectedIndicies.reduce((a, c) => {
            const { mappings } = environment.currentSprite;
            if (mappings.length > c) {
                a.push(mappings[c]);
            }
            return a;
        }, []);
    }

    @computed get hasActive() {
        return !!this.activeMappings.length;
    }

    @action mutateActive = (callback) => {
        if (!this.hasActive) return;
        this.activeMappings.forEach(callback);
    };

    @computed get center() {
        if (!this.activeMappings.length) return void 0;

        return getCenter(this.activeMappings);
    }

    // imported stuff

    @action deleteUnusedDPLCs = deleteUnusedDPLCs;
    @action deleteUnusedTiles = deleteUnusedTiles;
    @action toggleDPLCs = toggleDPLCs;

}

const mappingState = new MappingState();
export { mappingState };
