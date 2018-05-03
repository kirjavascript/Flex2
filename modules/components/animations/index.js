import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { baseSize, margin } from '!!sass-variables-loader!#styles/components/sprites.scss';
import { scrollbarWidth } from '!!sass-variables-loader!#styles/variables.scss';
import { DimensionsComponent } from '#util/dimensions-component';
import { Item, Input, File, Select, Editor } from '#ui';

const realBaseSize = parseInt(baseSize) + (parseInt(margin) * 2);

const SortableSprite = SortableElement(observer(class extends Component {

    render() {
        const { value, bbox: { x, y } } = this.props;

        return <div className="bbox" style={{
            left: x || 0,
            top: y || 0,
        }}>
            <Sprite data={value}/>
        </div>;
    }

}));

const SortableSpriteFast = SortableElement(({bbox: { x, y }}) => (
    <div className="bbox" style={{
        left: x || 0,
        top: y || 0,
        width: realBaseSize,
        height: realBaseSize,
    }}/>
));

const SortableSpriteList = SortableContainer(observer(({items, width, height, scroll}) => {

    const realWidth = width - parseInt(scrollbarWidth) -2;
    const realItemsPerRow = items.length; //Math.floor(realWidth / realBaseSize) ;
    const itemsPerRow = Math.max(1, realItemsPerRow);
    const rowCount = Math.ceil(items.length / itemsPerRow);
    //const remainder = !realItemsPerRow ? 0 : (realWidth % realBaseSize) / 2;
    const remainder = 0;

    const baseIndex = (0|(scroll / realBaseSize)) * itemsPerRow;
    const itemQty = (itemsPerRow * (height / realBaseSize)) + (itemsPerRow * 2);

    return (
        <div className="sprites" style={{
            height: rowCount * realBaseSize || 0
        }}>
            {items.map((value, index) => {
                // calculate positions
                const x = remainder + (index % itemsPerRow) * realBaseSize;
                const y = (0|(index / itemsPerRow)) * realBaseSize;

                return do {
                    if (index >= baseIndex && index < baseIndex + itemQty) {
                        <SortableSprite
                            key={`sprite-${index}`}
                            index={index}
                            value={value}
                            bbox={{x, y}}
                        />;
                    }
                    else {
                        <SortableSpriteFast
                            key={`sprite-${index}`}
                            index={index}
                            bbox={{x, y}}
                        />;
                    }

                };
            })}

            <SortableSprite 
                bbox={{x: (items.length) * realBaseSize, y: 0}}
                index={Infinity}
                disabled={true}
            />
            
        </div>
    );
}), {withRef: true});

@observer
export class Animations extends DimensionsComponent {

    getContainer = () => {
        return document.querySelector('.animSortContainer');
    };

    onSortEnd = ({oldIndex, newIndex, collection}) => {
        console.log(collection);
        environment.swapAnimation(oldIndex, newIndex, collection);
    };

    render() {
        const { animations } = environment;
        const { width, height, scroll } = this.state;
        const loopmodes = ['Loop All', 'Loop X Frames', 'Goto Animation X'];

        return <div className="animList">
            {animations.map((value, index) => {
                let currentAnimation = environment.getAnimationMappings(index);
                return <table 
                    key={'animtbl_' + index}
                    className="animSortContainer" 
                    ref={this.onContainerRef}
                ><tbody><tr>
                    <td>
                        0x{index.toString(16).toUpperCase()}
                        <Item
                            color="red"
                            //onClick={animations.loopAll}
                            inverted
                        >
                            Remove
                        </Item>
                        <Input
                            placeholder="Animation Name..."
                            store={animations[index]} 
                            accessor='name'
                        />
                        <Select
                            options={loopmodes}
                            store={animations[index]}
                            accessor='loopmode'
                        />
                    </td>
                    <td className="spriteSortContainer">
                        <SortableSpriteList
                            axis="xy"
                            helperClass="sortable-float"
                            onSortEnd={ (props) => {
                                environment.swapAnimation(props.oldIndex, props.newIndex, index);
                                currentAnimation = environment.getAnimationMappings(index);
                                this.forceUpdate();
                            }}
                            getContainer={this.getContainer}
                            items={currentAnimation}
                            width={width}
                            height={height}
                            scroll={scroll}
                        />
                    </td>
                </tr></tbody></table>;
            })}
        <Item
            color="blue"
            //onClick={animations.loopAll}
            inverted
        >
            + Animation
        </Item>
        </div>;
    }

}
