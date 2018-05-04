import React, { Component } from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';

@observer
export class Item extends Component {

    render() {
        const { prefix, color, inverted, width, ...otherProps } = this.props;
        return <div
            className="item"
            style={
                inverted ? {
                    backgroundColor: SVARS[color || 'white2'],
                    color: SVARS.black,
                    fontFamily: 'Hack Bold',
                    width: width
                } : {
                    color: SVARS[color],
                    padding: 0,
                    width: width
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
