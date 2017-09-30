import React, { Component } from 'react';
import { observer } from 'mobx-react';

@observer
export class Slider extends Component {

    onChange = (e) => {
        const { store, accessor } = this.props;
        store[accessor] = e.target.value;
    }

    constructor(props) {
        super(props);
    }

    render() {
        const { store, accessor, ...otherProps } = this.props;
        const value = store[accessor];

        return <div className="slider">
            <input
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

}
