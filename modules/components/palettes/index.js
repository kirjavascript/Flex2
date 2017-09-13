import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';

const Handle = SortableHandle(({lineIndex}) => <div className="index">
    {lineIndex}
</div>);

const SortableItem = SortableElement(observer(({line, lineIndex}) => (
    <div className="line">
        <Handle lineIndex={lineIndex}/>
        {line.map((color, colorIndex) => {
            return <div
                key={colorIndex}
                className="color"
                style={{
                    backgroundColor: color,
                    textAlign: 'center',
                }}
            >
            </div>;
        })}
    </div>
)));

const SortableList = SortableContainer(observer(({items, vert}) => {
    return (
        <div className={`palettes ${vert?'vert':''}`}>
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
}), {withRef: true});

@observer
export class Palettes extends Component {

    state = { vert: false };

    componentWillMount() {
        this.props.node.setEventListener('resize', (e) => {
            const { width, height } = e.rect;

            requestAnimationFrame(() => {
                this.setState({vert: width < height});
            });
        });
    }

    onRef = (node) => {
        if (node) {
            this.node = node;
        }
    };

    onSortEnd = ({ oldIndex, newIndex }) => {
        environment.swapPalette(oldIndex, newIndex);
    };

    render() {
        const { vert } = this.state;
        const { palettes } = environment;
        return (
            <SortableList
                onRef={this.onRef}
                axis={vert ? 'x' : 'y'}
                lockAxis={vert ? 'x' : 'y'}
                helperClass={`sortable-float-palette${vert?'-vert':''}`}
                items={palettes}
                lockToContainerEdges={true}
                useDragHandle={true}
                vert={vert}
                onSortEnd={this.onSortEnd}
            />
        );
    }

}
