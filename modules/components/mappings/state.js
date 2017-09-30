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

    @action mutateActive = (callback) => {
        this.activeMappings.forEach(callback);
    };

    @computed get center() {
        if (!this.activeMappings.length) return void 0;

        let [x, y] = [[], []];

        this.activeMappings.forEach(({top, left, width, height}) => {
            x.push(left + (width*8/2));
            y.push(top + (height*8/2));
        });

        x = 0|(x.reduce((a, b) => a + b, 0)) / x.length;
        y = 0|(y.reduce((a, b) => a + b, 0)) / y.length;

        return {x, y};
    }

}

const mappingState = new MappingState();
export { mappingState };
