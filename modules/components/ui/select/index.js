import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Dropdown from 'react-dropdown';

@observer
export class Select extends Component {

    onChange = ({value, label}) => {
        const { store, accessor } = this.props;
        store[accessor] = value;
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

        return <div className="row select">
            {label} &emsp;
            <Dropdown
                options={this.options}
                value={store[accessor]}
                onChange={this.onChange}
            />
        </div>;
    }

}
