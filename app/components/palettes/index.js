import React, { Component, useRef, useEffect, useState } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import {
    SortableContainer,
    SortableElement,
    SortableHandle,
} from 'react-sortable-hoc';
import { hexToMDHex } from '#formats/palette';
import Picker from './picker';
import Trigger from 'rc-trigger';

const Handle = SortableHandle(({ lineIndex }) => (
    <div className="index">{lineIndex}</div>
));

const Color = ({ color, onChange, rect }) => {
    const [points, setPoints] = useState(['br', 'tr']);
    const [offset, setOffset] = useState([2, 2])
    const node = useRef();
    useEffect(() => {
        if (node.current) {
            const { x, y, height } = node.current.getBoundingClientRect();
            const overflowX = x + 250 > window.innerWidth;
            const overflowY = (y + height) + 250 > window.innerHeight;
            const xType = 'lr'[+overflowX];
            setPoints(['tb'[+overflowY]+xType, 'bt'[+overflowY]+xType])
            setOffset([overflowX ? -2 : 2, overflowY ? -3 : 3])
        }
    }, [node.current, rect]);
    return (
        <Trigger
            action={['click']}
            prefixCls="color-picker"
            popup={(
                <Picker
                    color={color}
                    onChange={onChange}
                />
            )}
            popupAlign={{
                points,
                offset,
                targetOffset: [0, 0],
            }}
            destroyPopupOnHide
        >
            <div
                ref={node}
                className="color"
                style={{
                    backgroundColor: color,
                    textAlign: 'center',
                }}
            />
        </Trigger>
    );
};

const SortableItem = SortableElement(
    observer(({ line, lineIndex, rect }) => {
        return (
            <div className="line">
                <Handle lineIndex={lineIndex} />
                {line.map((color, colorIndex) => {
                    return (
                        <Color
                            key={colorIndex}
                            color={color}
                            rect={rect}
                            onChange={({ hex }) => {
                                environment.palettes[lineIndex][
                                    colorIndex
                                ] = hexToMDHex(hex);
                            }}
                        />
                    );
                })}
            </div>
        );
    }),
);

const SortableList = SortableContainer(
    observer(
        class extends Component {
            render() {
                const { items, rect } = this.props;
                return (
                    <div className={`palettes ${rect.vert ? 'vert' : ''}`}>
                        {items.map((line, index) => (
                            <SortableItem
                                key={`item-${index}`}
                                index={index}
                                line={line}
                                lineIndex={index}
                                rect={rect}
                            />
                        ))}
                    </div>
                );
            }
        },
    ),
    { withRef: true },
);

export const Palettes = observer(class Palettes extends Component {
    state = { width: 0, height: 0, x: 0, y: 0, };
    mounted = false;

    onRef = (node) => {
        if (node) {
            requestAnimationFrame(() => {
                const { width, height, x, y } = node.getBoundingClientRect();
                const vert = width < height;
                this.mounted && this.setState({ vert, width, height, x, y });
            });
        }
    };

    componentDidMount() {
        this.mounted = true;
        this.props.node.setEventListener('resize', (e) => {
            const vert = e.rect.width < e.rect.height;
            requestAnimationFrame(() => {
                this.mounted && this.setState({ vert, ...e.rect });
            });
        });
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    onSortEnd = ({ oldIndex, newIndex }) => {
        environment.swapPalette(oldIndex, newIndex);
    };

    render() {
        const { vert } = this.state;
        const { palettes } = environment;
        return (
            <div ref={this.onRef} className="paletteWrap">
                <SortableList
                    axis={vert ? 'x' : 'y'}
                    lockAxis={vert ? 'x' : 'y'}
                    helperClass={`sortable-float-palette${vert ? '-vert' : ''}`}
                    items={palettes}
                    lockToContainerEdges={true}
                    useDragHandle={true}
                    rect={this.state}
                    onSortEnd={this.onSortEnd}
                />

            </div>
        );
    }
});
