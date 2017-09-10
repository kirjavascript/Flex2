import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';
import {SortableContainer, SortableElement, arrayMove} from 'react-sortable-hoc';

// react-virtuallised collection
// @computed sprite?

const SortableItem = SortableElement(observer(({value}) => (
    <Sprite
        spriteIndex={value.spriteIndex}
        mappingList={value.mappingList}
    />
)));

const SortableList = SortableContainer(observer(({items}) => {
    return (
        <div className="sprites">
            {items.map((value, index) => (
                <SortableItem
                    key={`item-${index}`}
                    index={index}
                    value={{
                        mappingList: value,
                        spriteIndex: index,
                    }}
                />
            ))}
        </div>
    );
}), {withRef: true});

@observer
export class Sprites extends Component {

    onSortEnd = ({oldIndex, newIndex}) => {
        const { mappings, dplcs } = environment;
        // refactor to moveSprite
        environment.action(() => {
            dplcs.replace(arrayMove(dplcs, oldIndex, newIndex));
            mappings.replace(arrayMove(mappings, oldIndex, newIndex));
            environment.config.currentSprite = newIndex;
        });
    };


    render() {
        const { mappings } = environment;

        return <div>
            <div>(import sheet here)</div>

            <div>
                <SortableList
                    axis="xy"
                    helperClass="sortable-float"
                    items={environment.mappings}
                    onSortEnd={this.onSortEnd}
                />
            </div>

            <div className="sprites">
                {false && mappings.map((mappingList, spriteIndex) => (
                    <Sprite
                        key={spriteIndex}
                        spriteIndex={spriteIndex}
                        mappingList={mappingList}
                    />
                ))}
            </div>

        </div>;
    }

}
