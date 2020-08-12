import React, { Component } from 'react';
import { createPortal } from 'react-dom';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import {
    SortableContainer,
    SortableElement,
    SortableHandle,
} from 'react-sortable-hoc';
import { hexToMDHex } from '#formats/palette';
import ColorPicker from 'rc-color-picker';
import { SketchPicker } from 'react-color';

const Handle = SortableHandle(({ lineIndex }) => (
    <div className="index">{lineIndex}</div>
));

const container = document.body.appendChild(document.createElement('div'));
container.className = 'palette-color-picker';

const SortableItem = SortableElement(
    observer(({ line, lineIndex, onClick }) => {
        return (
            <div className="line">
                <Handle lineIndex={lineIndex} />
                {line.map((color, colorIndex) => {
                    return (
                        <div
                            key={colorIndex}
                            className="color"
                            style={{
                                backgroundColor: color,
                                textAlign: 'center',
                            }}
                            onClick={(e) => onClick(lineIndex, colorIndex, e)}
                        >
                            <ColorPicker
                                animation="slide-up"
                                color={color}
                                enableAlpha={false}
                                mode="RGB"
                                onChange={({ color }) => {
                                    environment.palettes[lineIndex][
                                        colorIndex
                                    ] = hexToMDHex(color);
                                }}
                            >
                                <div className="picker" />
                            </ColorPicker>
                        </div>
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
                                onClick={this.props.onClick}
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
    state = { vert: false, picker: false };
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

    onClickColor = (lineIndex, colorIndex, e) => {
        const rect = e.target.getBoundingClientRect();
        const { picker } = this.state;
        if (
            picker &&
            lineIndex === picker.lineIndex &&
            colorIndex === picker.colorIndex
        ) {
            this.closePicker();
        } else {
            this.setState({ picker: { lineIndex, colorIndex, rect } });
        }
    };

    closePicker = () => this.setState({ picker: false });

    render() {
        const { vert, picker } = this.state;
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
                    onClick={this.onClickColor}
                />
                {createPortal(
                    picker && (
                        <div
                            style={{
                                left: picker.rect.x + 'px',
                                top: picker.rect.y + picker.rect.height + 'px',
                                position: 'absolute',
                            }}
                        >
                            <SketchPicker />
                        </div>
                    ),
                    container,
                )}
            </div>
        );
    }
}
