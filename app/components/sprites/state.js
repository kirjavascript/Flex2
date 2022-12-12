import { observable, computed, action, autorun, toJS, makeObservable } from 'mobx';
import { storage } from '#store/storage';

class SpriteState {

    zoom = 4;

    constructor() {
        makeObservable(this, {
            zoom: observable,
        });
    }

}

const spriteState = new SpriteState();
storage(spriteState, 'sprite-state', ['zoom']);
export { spriteState };
