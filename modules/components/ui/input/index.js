import React, { Component } from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';

@observer
export class Input extends Component {

    onChange = (e) => {
        const { store, accessor, assert = (d) => d } = this.props;

        store[accessor] = assert(e.target.value);

        this.props.onChange &&
        this.props.onChange(store[accessor]);
    }

    onKeyDown = (e) => {
        const { store, accessor, isNumber, assert = (d) => d } = this.props;

        if (e.key == 'Escape') {
            e.target.blur();
        }
        else if (isNumber) {
            if (e.key == 'ArrowUp') {
                store[accessor] = assert(store[accessor] + 1);
                e.preventDefault();
                this.props.onChange &&
                this.props.onChange(store[accessor]);
            }
            else if (e.key == 'ArrowDown') {
                store[accessor] = assert(store[accessor] - 1);
                e.preventDefault();
                this.props.onChange &&
                this.props.onChange(store[accessor]);
            }
        }
    };

    render() {
        const {
            label,
            store,
            accessor,
            color,
            assert,
            isNumber,
            onChange,
            ...otherProps,
        } = this.props;

        return <div>
            {label && <span>
                {label}
                &emsp;
            </span>}
            <input
                style={color && {color: SVARS[color]}}
                value={store[accessor]}
                onChange={this.onChange}
                onKeyDown={this.onKeyDown}
                {...otherProps}
            />
        </div>;
    }

}
