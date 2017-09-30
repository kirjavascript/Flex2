import { observable, computed, action, autorun, toJS } from 'mobx';
import { environment } from '#store/environment';

class MappingState {

    // viewing

    @observable baseWidth = 600;
    @observable scale = 4;
    @observable x = 300;
    @observable y = 300;

    @action resetPanAndZoom = () => {
        this.scale = 4;
        this.x = 0|(this.baseWidth / 2);
        this.y = 300;
    };

    // misc

    @computed get activeMappings() {
        return this.selectedIndicies.map((index) => (
            environment.currentSprite.mappings[index]
        ));
    }

    @action mutateActive = (callback) => {
        this.activeMappings.forEach(callback);
    };

    // selections

    @observable selectedIndicies = [];

    @observable select = {
        active: false,
        x0: 0, y0: 0,
        x1: 0, y1: 0,
    };

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

    // clipboard

    @observable clipboard = {
        // type?
        // mappings: [],
        // dplcs: [],
    };

}

const mappingState = new MappingState();
export { mappingState };
