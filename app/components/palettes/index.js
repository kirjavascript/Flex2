import React, { Component } from 'react';
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

// anim, colour, placement

const SortableItem = SortableElement(
    observer(({ line, lineIndex }) => {
        return (
            <div className="line">
                <Handle lineIndex={lineIndex} />
                {line.map((color, colorIndex) => {
                    return (
                        <Trigger
                            key={colorIndex}
                            action={['click']}
                            prefixCls="color-picker"
                            popup={(
                                <Picker
                                    color={color}
                                    onChange={({ hex }) => {
                                        environment.palettes[lineIndex][
                                            colorIndex
                                        ] = hexToMDHex(hex);
                                    }}
                                />
                            )}
                            popupAlign={{
                                points: ['tl', 'bl'],
                                offset: [0, 3]
                            }}
                            destroyPopupOnHide
                        >
                            <div
                                className="color"
                                style={{
                                    backgroundColor: color,
                                    textAlign: 'center',
                                }}
                            />
                        </Trigger>
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
                const { items, vert } = this.props;
                return (
                    <div className={`palettes ${vert ? 'vert' : ''}`}>
                        {items.map((line, index) => (
                            <SortableItem
                                key={`item-${index}`}
                                index={index}
                                line={line}
                                lineIndex={index}
                            />
                        ))}
                    </div>
                );
            }
        },
    ),
    { withRef: true },
);

@observer
export class Palettes extends Component {
    state = { vert: false };
    mounted = false;

    onRef = (node) => {
        if (node) {
            requestAnimationFrame(() => {
                const { width, height } = node.getBoundingClientRect();
                this.mounted && this.setState({ vert: width < height });
            });
        }
    };

    componentDidMount() {
        this.mounted = true;
        this.props.node.setEventListener('resize', (e) => {
            const { width, height } = e.rect;

            requestAnimationFrame(() => {
                this.mounted && this.setState({ vert: width < height });
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
                    vert={vert}
                    onSortEnd={this.onSortEnd}
                />

            </div>
        );
    }
}
