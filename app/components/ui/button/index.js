import React from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';
import classNames from 'classnames';

export const Button = observer((props) => {
        const { color, large, ...otherProps } = props;
        return <button
            className={classNames('button', large && 'large')}
            style={
                {
                    backgroundColor: SVARS[color || 'white2'],
                    color: SVARS.black,
                }
            }
            {...otherProps}
        >
            {props.children}
        </button>;

});
