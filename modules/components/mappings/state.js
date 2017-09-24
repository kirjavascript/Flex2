import { observable, computed, action, autorun, toJS } from 'mobx';

class MappingState {

    // viewing

    baseSize = 600;
    @observable scale = 4;
    @observable x = 0;
    @observable y = 0;

    @action resetPanAndZoom = () => {
        this.scale = 4;
        this.x = 0;
        this.y = 0;
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

}

const mappingState = new MappingState();
export { mappingState };
