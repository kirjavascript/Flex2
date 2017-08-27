import React, { Component } from 'react';

export class Item extends Component {

    render() {
        const { prefix, color, ...otherProps } = this.props;
        return <div className={`item ${color}`} {...otherProps}>
            {prefix}
            <div>
                {this.props.children}
            </div>
        </div>;
    }

}
