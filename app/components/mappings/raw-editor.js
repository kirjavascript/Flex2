import React, { Component } from 'react';
import {
    SortableContainer,
    SortableElement,
    SortableHandle,
} from 'react-sortable-hoc';
import arrayMove from 'array-move';
import { mappingState } from './state';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Select, Input, Item, Button, Modal } from '#ui';
import { Tile } from '../art/tile';
import {
    isNumber,
    isPositiveNumber,
    isDPLCSize,
    isWidthHeight,
} from '#util/assertions';

const Handle = SortableHandle(() => (
    <div className="handle">
        <svg viewBox="20 20 56 56" width="26" height="26">
            <path d="M73 48.4l-10.4-9.6v4.8H52.4V33.4h4.8L47.6 23l-9 10.4h5v10.2H33.3v-4.8L23 48.4l10.4 9v-5h10.2v10.3h-4.8L47.6 73l9.6-10.4h-4.8V52.4h10.2v4.8L73 48.4z" />
        </svg>
    </div>
));

// mappings

const SortableMappingItem = SortableElement(
    observer(({ mapping, mappingIndex }) => (
        <div className="mapping-data">
            <Handle />
            <div className="properties">
                <div className="datum">
                    <div className="label">top</div>
                    <Input
                        store={mapping}
                        accessor="top"
                        assert={isNumber}
                        isNumber
                    />
                </div>
                <div className="datum">
                    <div className="label">left</div>
                    <Input
                        store={mapping}
                        accessor="left"
                        assert={isNumber}
                        isNumber
                    />
                </div>
                <div className="datum">
                    <div className="label">tile</div>
                    <Input
                        store={mapping}
                        accessor="art"
                        assert={isPositiveNumber}
                        isNumber
                    />
                </div>
                <div className="datum">
                    <div className="label">width</div>
                    <Input
                        store={mapping}
                        accessor="width"
                        assert={isWidthHeight}
                        isNumber
                    />
                </div>
                <div className="datum">
                    <div className="label">height</div>
                    <Input
                        store={mapping}
                        accessor="height"
                        assert={isWidthHeight}
                        isNumber
                    />
                </div>
                <div className="datum">
                    <div className="label">priority</div>
                    <Select
                        store={mapping}
                        accessor="priority"
                        options={[
                            { label: 'yes', value: true },
                            { label: 'no', value: false },
                        ]}
                    />
                </div>
                <div className="datum">
                    <div className="label">vflip</div>
                    <Select
                        store={mapping}
                        accessor="vflip"
                        options={[
                            { label: 'yes', value: true },
                            { label: 'no', value: false },
                        ]}
                    />
                </div>
                <div className="datum">
                    <div className="label">hflip</div>
                    <Select
                        store={mapping}
                        accessor="hflip"
                        options={[
                            { label: 'yes', value: true },
                            { label: 'no', value: false },
                        ]}
                    />
                </div>
                <div className="datum">
                    <div className="label">palette</div>
                    <Select
                        store={mapping}
                        accessor="palette"
                        options={[0, 1, 2, 3]}
                        flipScroll
                    />
                </div>
            </div>
            <Item
                inverted
                onClick={() => {
                    environment.currentSprite.mappings.splice(mappingIndex, 1);
                }}
            >
                Delete
            </Item>
        </div>
    )),
);

const SortableMappingList = SortableContainer(
    observer(
        class extends Component {
            render() {
                const { items } = this.props;
                return (
                    <div>
                        {items.map((mapping, index) => (
                            <SortableMappingItem
                                key={`item-${index}`}
                                index={index}
                                mapping={mapping}
                                mappingIndex={index}
                            />
                        ))}
                    </div>
                );
            }
        },
    ),
    { withRef: true },
);

// dplcs

const SortableDPLCItem = SortableElement(
    observer(({ dplc, dplcIndex }) => (
        <div className="mapping-data">
            <Handle />
            <div className="properties">
                <div className="datum">
                    <div className="label">tile</div>
                    <Input
                        store={dplc}
                        accessor="art"
                        assert={isPositiveNumber}
                        isNumber
                    />
                </div>
                <div className="datum">
                    <div className="label">length</div>
                    <Input
                        store={dplc}
                        accessor="size"
                        assert={isDPLCSize}
                        isNumber
                    />
                </div>
                <div className="dplc-tiles">
                    {Array.from({ length: dplc.size }).map((_, i) => {
                        const data =
                            environment.tiles.length > dplc.art + i
                                ? environment.tiles[dplc.art + i]
                                : undefined;
                        return <Tile key={i} data={data} />;
                    })}
                </div>
            </div>
            <Item
                inverted
                onClick={() => {
                    environment.currentSprite.dplcs.splice(dplcIndex, 1);
                }}
            >
                Delete
            </Item>
        </div>
    )),
);

const SortableDPLCList = SortableContainer(
    observer(
        class extends Component {
            render() {
                const { items } = this.props;
                return (
                    <div>
                        {items.map((dplc, index) => (
                            <SortableDPLCItem
                                key={`item-${index}`}
                                index={index}
                                dplc={dplc}
                                dplcIndex={index}
                            />
                        ))}
                    </div>
                );
            }
        },
    ),
    { withRef: true },
);

export const RawEditor = observer(
    class RawEditor extends Component {
        onSortEndMapping = ({ oldIndex, newIndex }) => {
            const {
                currentSprite: { mappings },
            } = environment;
            mappings.replace(arrayMove(mappings, oldIndex, newIndex));
        };

        addNewMapping = () => {
            const {
                currentSprite: { mappings },
            } = environment;
            mappings.push({
                art: 0,
                priority: false,
                left: 0,
                top: 0,
                width: 1,
                height: 1,
                vflip: false,
                hflip: false,
                palette: 0,
            });
        };

        onSortEndDPLC = ({ oldIndex, newIndex }) => {
            const {
                currentSprite: { dplcs },
            } = environment;
            dplcs.replace(arrayMove(dplcs, oldIndex, newIndex));
        };

        addNewDPLC = () => {
            const {
                currentSprite: { dplcs },
            } = environment;
            dplcs.push({
                art: 0,
                size: 1,
            });
        };

        render() {
            const {
                currentSprite: { mappings, dplcs },
                config: { currentTile, dplcsEnabled },
            } = environment;
            const {
                rawEditor: { active },
            } = mappingState;

            return (
                <Modal
                    spring={{
                        top: active ? 15 : -100,
                        opacity: active ? 1 : 0,
                    }}
                    className="raw-mapping-data"
                >
                    <div className="close">
                        <Item>Raw Mapping Editor</Item>
                        <Button
                            color="magenta"
                            onClick={mappingState.toggleRawEditor}
                        >
                            close
                        </Button>
                    </div>
                    <SortableMappingList
                        axis="y"
                        lockAxis="y"
                        items={mappings}
                        lockToContainerEdges={true}
                        useDragHandle={true}
                        onSortEnd={this.onSortEndMapping}
                    />
                    <Item onClick={this.addNewMapping} inverted>
                        Add New Mapping
                    </Item>
                    {dplcsEnabled && (
                        <div className="raw-dplc-data">
                            <SortableDPLCList
                                axis="y"
                                lockAxis="y"
                                items={dplcs || []}
                                lockToContainerEdges={true}
                                useDragHandle={true}
                                onSortEnd={this.onSortEndDPLC}
                            />
                            <div className="buttons">
                                <Item onClick={this.addNewDPLC} inverted>
                                    Add New DPLC
                                </Item>
                                <Item
                                    onClick={mappingState.optimizeCurrentDPLCs}
                                    inverted
                                >
                                    Optimise DPLCs
                                </Item>
                            </div>
                        </div>
                    )}
                </Modal>
            );
        }
    },
);
