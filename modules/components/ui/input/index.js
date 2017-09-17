import React, { Component } from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';

@observer
export class Input extends Component {

    onChange = (e) => {
        const { store, accessor } = this.props;
        store[accessor] = e.target.value;
    }

    render() {
        const { label, store, accessor, color, ...otherProps } = this.props;

        return <div>
            {label} &emsp;
            <input
                style={color && {color: SVARS[color]}}
                value={store[accessor]}
                onChange={this.onChange}
                {...otherProps}
            />
        </div>;
    }

}
