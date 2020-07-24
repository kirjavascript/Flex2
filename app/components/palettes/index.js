import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { hexToMDHex } from '#formats/palette';
import ColorPicker from 'rc-color-picker';

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
                <ColorPicker
                    animation="slide-up"
                    color={color}
                    enableAlpha={false}
                    mode="RGB"
                    onChange={({color}) => {
                        environment.palettes[lineIndex][colorIndex] = hexToMDHex(color);
                    }}
                >
                    <div className="picker"/>
                </ColorPicker>
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
    mounted = false;

    onRef = (node) => {
        if (node) {
            requestAnimationFrame(() => {
                const { width, height } = node.getBoundingClientRect();
                this.mounted &&
                this.setState({vert: width < height});
            });
        }
    };

    componentWillMount() {
        this.mounted = true;
        this.props.node.setEventListener('resize', (e) => {
            const { width, height } = e.rect;

            requestAnimationFrame(() => {
                this.mounted &&
                this.setState({vert: width < height});
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
                    helperClass={`sortable-float-palette${vert?'-vert':''}`}
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
