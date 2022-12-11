import React, { Component } from 'react';
import { observer } from 'mobx-react';

export const Slider = observer(class Slider extends Component {

    onChange = (e) => {
        const { store, accessor } = this.props;
        store[accessor] = parseInt(e.target.value);
        this.node.blur();
    }

    render() {
        const { store, accessor, ...otherProps } = this.props;
        const value = store[accessor];

        return <div className="slider">
            <input
                ref={(node) => { this.node = node; }}
                type="range"
                min="1"
                max="20"
                step="1"
                value={value}
                className="mousetrap"
                onChange={this.onChange}
                {...otherProps}/>
        </div>;
    }

});
