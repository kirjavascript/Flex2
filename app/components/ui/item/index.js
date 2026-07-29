import React, { Component } from 'react';
import SVARS from 'sass-variables';
import { observer } from 'mobx-react';

export const Item = observer(class Item extends Component {

    render() {
        const { prefix, color, inverted, bold, ...otherProps } = this.props;
        return <div
            className="item"
            style={
                inverted ? {
                    backgroundColor: SVARS[color || 'white2'],
                    color: SVARS.black,
                } : {
                    color: SVARS[color],
                    padding: 0,
                    ...(!color && !bold && { fontFamily: 'Hack Regular' }),
                }
            }
            {...otherProps}
        >
            {prefix}
            <div>
                {this.props.children}
            </div>
        </div>;
    }

});
