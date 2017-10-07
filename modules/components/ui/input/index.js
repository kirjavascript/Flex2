import React, { Component } from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';

@observer
export class Input extends Component {

    onChange = (e) => {
        const { store, accessor, assert = (d) => d } = this.props;

        store[accessor] = assert(e.target.value);
    }

    render() {
        const { label, store, accessor, color, assert, ...otherProps } = this.props;

        return <div>
            {label && <span>
                {label}
                &emsp;
            </span>}
            <input
                style={color && {color: SVARS[color]}}
                value={store[accessor]}
                onChange={this.onChange}
                {...otherProps}
            />
        </div>;
    }

}
