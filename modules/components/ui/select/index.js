import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Dropdown from 'react-dropdown';

@observer
export class Select extends Component {

    onChange = ({label}) => {
        const { store, accessor } = this.props;
        // value is sometimes incorrect so
        store[accessor] = this.options.find((d) => d.label == label).value;
    }

    constructor(props) {
        super(props);

        this.options = this.props.options.map((option) => {
            if (typeof option == 'string') {
                return {label: option, value: option};
            }
            else {
                return option;
            }
        });
    }

    render() {
        const { label, store, accessor, ...otherProps } = this.props;
        const value = this.options.find((d) => d.value == store[accessor]).label;

        return <div className="row select">
            {label} &emsp;
            <Dropdown
                options={this.options}
                value={value}
                onChange={this.onChange}
            />
        </div>;
    }

}
