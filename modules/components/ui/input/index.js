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

    mutateNum = (num = 1) => {
        const { store, accessor, isNumber, assert = (d) => d } = this.props;
        store[accessor] = assert(store[accessor] + num);
        this.props.onChange &&
        this.props.onChange(store[accessor]);
    };

    onKeyDown = (e) => {
        if (e.key == 'Escape') {
            e.target.blur();
        }
        else if (this.props.isNumber) {
            if (e.key == 'ArrowUp') {
                this.mutateNum(1);
                e.preventDefault();
            }
            else if (e.key == 'ArrowDown') {
                this.mutateNum(-1);
                e.preventDefault();
            }
        }
    };

    onWheel = (e) => {
        if (this.props.isNumber) {
            this.mutateNum(e.nativeEvent.deltaY > 0 ? -1 : 1);
            e.preventDefault();
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
                onWheel={this.onWheel}
                {...otherProps}
            />
        </div>;
    }

}
