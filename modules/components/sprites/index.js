import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import SVARS from 'sass-variables-loader!#styles/components/sprites.scss';

const { baseSize, margin } = SVARS;
const realBaseSize = parseInt(baseSize) + (parseInt(margin) * 2);

const SortableItem = SortableElement(observer(class extends Component {

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

const SortableItemFast = SortableElement(({value, bbox: { x, y }}) => (
    <div className="bbox" style={{
        left: x || 0,
        top: y || 0,
        width: realBaseSize,
        height: realBaseSize,
    }}/>
));

const SortableList = SortableContainer(observer(({items, width, height, scroll}) => {

    const itemsPerRow = Math.floor(width / realBaseSize);
    const rowCount = Math.ceil(items.length / itemsPerRow);
    const remainder = -5 + (width % realBaseSize) / 2; // 5 is scrollbar width /2

    const baseIndex = (0|(scroll / realBaseSize)) * itemsPerRow;
    const itemQty = (itemsPerRow * (height / realBaseSize)) + (itemsPerRow * 2);

    return (
        <div className="sprites" style={{height: rowCount * realBaseSize || 0}}>
            {items.map((value, index) => {

                // calculate positions
                const x = remainder + (index % itemsPerRow) * realBaseSize;
                const y = (0|(index / itemsPerRow)) * realBaseSize;

                return do {
                    if (index >= baseIndex && index < baseIndex + itemQty) {
                        <SortableItem
                            key={`item-${index}`}
                            index={index}
                            value={value}
                            bbox={{x, y}}
                        />;
                    }
                    else {
                        <SortableItemFast
                            key={`item-${index}`}
                            index={index}
                            bbox={{x, y}}
                        />;
                    }
                };
            })}
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

    // --

    state = {};
    mounted = false;

    componentWillMount() {
        this.mounted = true;
        this.props.node.setEventListener('resize', (e) => {
            const { width, height } = e.rect;

            requestAnimationFrame(() => {
                this.mounted &&
                this.setState({width, height});
            });
        });

        this.onScroll = (e) => {
            this.mounted &&
            this.setState({scroll: e.target.scrollTop});
        };
    }

    componentWillUnmount() {
        this.mounted = false;
        this.node.removeEventListener('scroll', this.onScroll);
    }

    onContainerRef = (node) => {
        if (node) {
            node.addEventListener('scroll', this.onScroll);
            requestAnimationFrame(() => {
                const { width, height } = node.getBoundingClientRect();
                const scroll = node.scrollTop;
                this.mounted &&
                this.setState({width, height, scroll});
            });
            this.node = node;
        }
    };

    render() {
        const { sprites } = environment;
        const { width, height, scroll } = this.state;

        return <div className="spriteList">
            import sprites

            <div className="spriteSortContainer" ref={this.onContainerRef}>
                <SortableList
                    axis="xy"
                    helperClass="sortable-float"
                    onSortEnd={this.onSortEnd}
                    getContainer={this.getContainer}
                    items={sprites}
                    width={width}
                    height={height}
                    scroll={scroll}
                />
            </div>

        </div>;
    }

}
