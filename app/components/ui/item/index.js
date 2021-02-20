import React, { Component } from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';

@observer
export class Item extends Component {

    render() {
        const { prefix, color, inverted, ...otherProps } = this.props;
        return <div
            className="item"
            style={
                inverted ? {
                    backgroundColor: SVARS[color || 'white2'],
                    color: SVARS.black,
                } : {
                    color: SVARS[color],
                    padding: 0,
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

}
