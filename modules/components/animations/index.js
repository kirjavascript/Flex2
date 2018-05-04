import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { baseSize, margin } from '!!sass-variables-loader!#styles/components/sprites.scss';
import { scrollbarWidth } from '!!sass-variables-loader!#styles/variables.scss';
import { DimensionsComponent } from '#util/dimensions-component';
import { Item, Input, Select, Slider } from '#ui';

const realBaseSize = parseInt(baseSize) + (parseInt(margin) * 2);

const SortableSprite = SortableElement(observer(class extends Component {

    render() {
        const { value, bbox: { x, y }, pos, frames, parent } = this.props;

        return <div className="bbox" style={{
            left: x || 0,
            top: y || 0,
        }}>
            <Sprite 
                data={value}
                pos={pos}
                frames={frames}
                parent={parent}
            />
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

const SortableSpriteList = SortableContainer(observer(({items, width, height, scroll, frames, parent}) => {

    const realWidth = width - parseInt(scrollbarWidth) -2;
    const realItemsPerRow = items.length;
    const itemsPerRow = Math.max(1, realItemsPerRow);
    const rowCount = Math.ceil(items.length / itemsPerRow);
    const remainder = 0;

    const baseIndex = (0|(scroll / realBaseSize)) * itemsPerRow;
    const itemQty = (itemsPerRow * (height / realBaseSize)) + (itemsPerRow * 2);

    return (
        <div className="sprites" style={{
            height: realBaseSize || 0
        }}>
            {items.map((value, index) => {
                // calculate positions
                const x = remainder + (index % itemsPerRow) * realBaseSize;
                const y = (0|(index / itemsPerRow)) * realBaseSize;

                return do {
                    if (index >= baseIndex && index < baseIndex + itemQty) {
                        <SortableSprite
                            key={`sprite-${index}`}
                            value={value}
                            bbox={{x, y}}
                            pos={index}
                            frames={frames}
                            parent={parent}
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
                pos={Infinity}
                disabled={true}
                frames={frames}
                parent={parent}
            />
            
        </div>
    );
}), {withRef: true});

@observer
export class Animations extends DimensionsComponent {

    getContainer = () => {
        return document.querySelector('.animSortContainer');
    };

    render() {
        const { animations } = environment;
        const { width, height, scroll } = this.state;
        const loopmodes = [
            'Loop All', // 0xFF
            'Loop X Frames', // 0xFE, # frames to rewind
            'Goto Animation X', //0xFD, animation #
            'Increment Primary Routine', //0xFC
            'Reset Secondary Routine', //0xFB
            'Increment Secondary Routine', //0xFA
            'Increment Status Byte 2A', //0xF9
        ];

        return <div className="animList">
            {animations.map((value, index) => {
                let currentAnimation = environment.getAnimationMappings(index);
                return <table 
                    key={'animtbl_' + index}
                    className="animSortContainer" 
                    ref={this.onContainerRef}
                ><tbody><tr>
                    <td>
                        {index}
                        <Item
                            color="red"
                            onClick={() => {environment.removeAnim(index);}}
                            inverted
                        >
                            Remove
                        </Item>
                        <Input
                            label='Name'
                            placeholder="Animation Name..."
                            store={animations[index]} 
                            accessor='name'
                            width='106px'
                        />
                        <Input
                            label='Speed'
                            store={animations[index]}
                            accessor='speed'
                            min='0'
                            max='255'
                            isNumber={true}
                            width='97px'
                        />
                        <Select
                            options={loopmodes}
                            store={animations[index]}
                            accessor='loopMode'
                        />
                        {
                            animations[index].loopMode == 'Loop X Frames' && 
                            <Input
                                label='Loop Last'
                                store={animations[index]}
                                accessor='loopLen'
                                min='1'
                                max={animations[index].frames.length}
                                isNumber={true}
                                width='64px'
                            />
                        }
                        {
                            animations[index].loopMode == 'Goto Animation X' && 
                            <Input
                                label='Goto'
                                store={animations[index]}
                                accessor='gotoAnim'
                                min='0'
                                max={animations.length}
                                isNumber={true}
                                width='106px'
                            />
                        }
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
                            frames={environment.animations[index].frames}
                            parent={this}
                        />
                    </td>
                </tr></tbody></table>;
            })}
        <Item
            color="blue"
            onClick={environment.addAnim}
            inverted
        >
            Add Animation
        </Item>
        </div>;
    }

}
