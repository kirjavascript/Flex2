import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Dropdown from './dist';

@observer
export class Select extends Component {

    onChange = ({label}) => {
        const { store, accessor } = this.props;
        // value is sometimes incorrect so
        store[accessor] = this.options.find((d) => d.label == label).value;

        this.props.onChange &&
        this.props.onChange(store[accessor]);
    }

    onWheel = (e) => {
        const { store, accessor, flipScroll } = this.props;
        const delta = e.nativeEvent.deltaY > 0 ? 1 : -1;
        const index = (delta * (flipScroll ? -1 : 1))  + this.options.findIndex((d) => d.value == store[accessor]);

        if (index >= 0 && index < this.options.length) {
            store[accessor] = this.options[index].value;
            this.props.onChange &&
            this.props.onChange(store[accessor]);
        }

        e.preventDefault();
    };

    constructor(props) {
        super(props);

        this.options = this.props.options.map((option) => {
            if (typeof option !== 'object') {
                return {label: String(option), value: option};
            }
            else {
                return option;
            }
        });
    }

    render() {
        const { label, store, accessor, onChange, color, ...otherProps } = this.props;
        const value = this.options.find((d) => d.value == store[accessor]).label;

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
                onWheel={this.onWheel}
            />
        </div>;
    }

}
