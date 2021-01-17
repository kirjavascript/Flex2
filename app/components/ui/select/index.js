import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Dropdown from './dist';

@observer
export class Select extends Component {

    constructor(props) {
        super(props);

        console.log(this.props.options);

        this.options = this.props.options.map((option) => {
            if (typeof option !== 'object') {
                return {label: String(option), value: option};
            }
            else {
                return option;
            }
        });
    }

    onChange = ({label}) => {
        const { store, accessor } = this.props;
        // value is sometimes incorrect so
        store[accessor] = this.options.find((d) => d.label == label).value;

        this.props.onChange &&
        this.props.onChange(store[accessor]);
    }

    onWheel = (e) => {
        const { store, accessor, flipScroll } = this.props;
        const delta = e.deltaY > 0 ? 1 : -1;
        const index = (delta * (flipScroll ? -1 : 1))  + this.options.findIndex((d) => d.value == store[accessor]);

        if (index >= 0 && index < this.options.length) {
            store[accessor] = this.options[index].value;
            this.props.onChange &&
            this.props.onChange(store[accessor]);
        }

        e.preventDefault();
    };

    placeholderRef = (node) => {
        if (node) {
            this.placeholderRefNode = node;
            node.addEventListener('wheel', this.onWheel, { passive: false });
        } else {
            this.placeholderRefNode.removeEventListener('wheel', this.onWheel);
        }
    };

    render() {
        const { label, store, accessor, color } = this.props;
        const value = this.options.find((d) => d.value == store[accessor])?.label;

        return <div className="row select">
            {label && <span>
                {label}
                &emsp;
            </span>}
            <Dropdown
                options={this.options}
                value={String(value)}
                onChange={this.onChange}
                color={color}
                placeholderRef={this.placeholderRef}
            />
        </div>;
    }

}
