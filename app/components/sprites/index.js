import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Sprite } from './sprite';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import {
    baseSize,
    margin,
} from '!!sass-variables-loader!#styles/components/sprites.scss';
import { scrollbarWidth } from '!!sass-variables-loader!#styles/variables.scss';
import { DimensionsComponent } from '#util/dimensions-component';

const realBaseSize = parseInt(baseSize) + parseInt(margin) * 2;

const SortableItem = SortableElement(
    observer(
        class extends Component {
            render() {
                const {
                    value,
                    bbox: { x, y },
                } = this.props;

                return (
                    <div
                        className="bbox"
                        style={{
                            left: x || 0,
                            top: y || 0,
                        }}
                    >
                        <Sprite data={value} />
                    </div>
                );
            }
        },
    ),
);

const SortableItemFast = SortableElement(({ bbox: { x, y } }) => (
    <div
        className="bbox"
        style={{
            left: x || 0,
            top: y || 0,
            width: realBaseSize,
            height: realBaseSize,
        }}
    />
));

const SortableList = SortableContainer(
    observer(class extends Component {
        render() {
            const { items, width, height, scroll } = this.props;

            const realWidth = width - parseInt(scrollbarWidth) - 2;
            const realItemsPerRow = Math.floor(realWidth / realBaseSize);
            const itemsPerRow = Math.max(1, realItemsPerRow);
            const rowCount = Math.ceil(items.length / itemsPerRow);
            const remainder = !realItemsPerRow ? 0 : (realWidth % realBaseSize) / 2;

            const baseIndex = (0 | (scroll / realBaseSize)) * itemsPerRow;
            const itemQty = itemsPerRow * (height / realBaseSize) + itemsPerRow * 2;

            return (
                <div
                    className="sprites"
                    style={{ height: rowCount * realBaseSize || 0 }}
                >
                    {items.map((value, index) => {
                        // calculate positions
                        const x = remainder + (index % itemsPerRow) * realBaseSize;
                        const y = (0 | (index / itemsPerRow)) * realBaseSize;

                        if (index >= baseIndex && index < baseIndex + itemQty) {
                            return (
                                <SortableItem
                                    key={`sprite-${index}`}
                                    index={index}
                                    value={value}
                                    bbox={{ x, y }}
                                />
                            );
                        } else {
                            return (
                                <SortableItemFast
                                    key={`sprite-${index}`}
                                    index={index}
                                    bbox={{ x, y }}
                                />
                            );
                        }
                    })}
                </div>
            );
        }
    }),
    { withRef: true },
);

@observer
export class Sprites extends DimensionsComponent {
    getContainer = () => {
        return document.querySelector('.spriteSortContainer');
    };

    onSortEnd = ({ oldIndex, newIndex }) => {
        environment.swapSprite(oldIndex, newIndex);
        environment.config.currentSprite = newIndex;
    };

    render() {
        const { sprites } = environment;
        const { width, height, scroll } = this.state;

        return (
            <div className="spriteList">
                <div className="spriteSortContainer" ref={this.onContainerRef}>
                    <SortableList
                        axis="xy"
                        helperClass="sortable-float-sprite"
                        onSortEnd={this.onSortEnd}
                        getContainer={this.getContainer}
                        items={sprites}
                        width={width}
                        height={height}
                        scroll={scroll}
                    />
                </div>
            </div>
        );
    }
}
