import React, { Component } from 'react';
import { Motion, spring } from 'react-motion';
import { mappingState } from './state';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { Select, Input, Item } from '#ui';
import { SortableContainer, SortableElement, SortableHandle, arrayMove } from 'react-sortable-hoc';

const isNumber = (num) => {
    const value = parseInt(num, 10);
    return Number.isNaN(value) ? 0 : value;
};

const isPositiveNumber = (num) => {
    return Math.abs(isNumber(num));
};

const Handle = SortableHandle(() => <div className="handle">
    <svg viewBox="20 20 56 56" width="26" height="26">
      <path d="M73 48.4l-10.4-9.6v4.8H52.4V33.4h4.8L47.6 23l-9 10.4h5v10.2H33.3v-4.8L23 48.4l10.4 9v-5h10.2v10.3h-4.8L47.6 73l9.6-10.4h-4.8V52.4h10.2v4.8L73 48.4z"/>
    </svg>
</div>);

const SortableItem = SortableElement(observer(({mapping, mappingIndex}) => (
    <div className="mapping-data">
        <Handle/>
        <div className="properties">
            <div className="datum">
                <div className="label">top</div>
                <Input
                    store={mapping}
                    accessor="top"
                    assert={isNumber}
                />
            </div>
            <div className="datum">
                <div className="label">left</div>
                <Input
                    store={mapping}
                    accessor="left"
                    assert={isNumber}
                />
            </div>
            <div className="datum">
                <div className="label">tile</div>
                <Input
                    store={mapping}
                    accessor="art"
                    assert={isPositiveNumber}
                />
            </div>
            <div className="datum">
                <div className="label">width</div>
                <Select
                    store={mapping}
                    accessor="width"
                    options={[1, 2, 3, 4]}
                />
            </div>
            <div className="datum">
                <div className="label">height</div>
                <Select
                    store={mapping}
                    accessor="height"
                    options={[1, 2, 3, 4]}
                />
            </div>
            <div className="datum">
                <div className="label">priority</div>
                <Select
                    store={mapping}
                    accessor="priority"
                    options={[{label: 'yes', value: true},{label: 'no', value : false}]}
                />
            </div>
            <div className="datum">
                <div className="label">vflip</div>
                <Select
                    store={mapping}
                    accessor="vflip"
                    options={[{label: 'yes', value: true},{label: 'no', value : false}]}
                />
            </div>
            <div className="datum">
                <div className="label">hflip</div>
                <Select
                    store={mapping}
                    accessor="hflip"
                    options={[{label: 'yes', value: true},{label: 'no', value : false}]}
                />
            </div>
            <div className="datum">
                <div className="label">palette</div>
                <Select
                    store={mapping}
                    accessor="palette"
                    options={[0, 1, 2, 3]}
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
)));

const SortableList = SortableContainer(observer(({items, vert}) => {
    return (
        <div>
            {items.map((mapping, index) => (
                <SortableItem
                    key={`item-${index}`}
                    index={index}
                    mapping={mapping}
                    mappingIndex={index}
                />
            ))}
        </div>
    );
}), {withRef: true});

@observer
export class RawEditor extends Component {

    onSortEnd = ({ oldIndex, newIndex }) => {
        const { currentSprite: { mappings } } = environment;
        mappings.replace(arrayMove(mappings, oldIndex, newIndex));
    };

    addNew = () => {
        const { currentSprite: { mappings } } = environment;
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

    render() {
        const { currentSprite: { mappings }, config: { currentTile } } = environment;
        const { scale, rawEditor: { active } } = mappingState;

        return (
            active && <div className="raw-mapping-data">
                <SortableList
                    axis="y"
                    lockAxis="y"
                    items={mappings}
                    lockToContainerEdges={true}
                    useDragHandle={true}
                    onSortEnd={this.onSortEnd}
                />
                <Item
                    onClick={this.addNew}
                    inverted
                >
                    Add New Mapping
                </Item>
            </div>
        );
    }

}
