import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { AsyncRender } from '#util/async-render';

const SortableItem = AsyncRender(SortableElement(observer(({value}) => (
    <Sprite data={value}/>
))));

const SortableList = SortableContainer(observer(({items}) => {
    return (
        <div className="sprites">
            {items.map((value, index) => (
                <SortableItem
                    key={`item-${index}`}
                    index={index}
                    value={value}
                    delay={index}
                    exclude={index < 10}
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
        const { sprites } = environment;

        return <div className="spriteList">
            import sprites

            <div className="spriteSortContainer">
                <SortableList
                    axis="xy"
                    helperClass="sortable-float"
                    items={sprites}
                    onSortEnd={this.onSortEnd}
                    getContainer={this.getContainer}
                />
            </div>

        </div>;
    }

}
