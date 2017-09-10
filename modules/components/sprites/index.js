import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';
import {SortableContainer, SortableElement, arrayMove} from 'react-sortable-hoc';

const SortableItem = SortableElement(observer(({value}) => (
    <Sprite
        spriteIndex={value.spriteIndex}
        mappingList={value.mappingList}
    />
)));

const SortableList = SortableContainer(observer(({items}) => {
    return (
        <div className="sprites" ref={(node) => {
            node && node.querySelectorAll('.sprite').forEach((n) => {
                // console.log(n.getBoundingClientRect());
            });
        }}>
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

    getContainer = () => {
        return document.querySelector('.spriteSortContainer');
    };

    onSortEnd = ({oldIndex, newIndex}) => {
        environment.swapSprite(oldIndex, newIndex);
        environment.config.currentSprite = newIndex;
    };

    render() {
        const { mappings } = environment;

        return <div className="spriteList">
            <div>(import sheet here)</div>

            <div className="spriteSortContainer">
                <SortableList
                    axis="xy"
                    helperClass="sortable-float"
                    items={environment.mappings}
                    onSortEnd={this.onSortEnd}
                    getContainer={this.getContainer}
                />
            </div>

        </div>;
    }

}
