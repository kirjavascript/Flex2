import { observable, computed, action, autorun, toJS } from 'mobx';

class MappingState {

    baseSize = 600;
    @observable scale = 4;


}

const mappingState = new MappingState();
export { mappingState };
