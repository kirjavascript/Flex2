import React from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';

export const Button = observer((props) => {
        const { color, ...otherProps } = props;
        return <button
            className='button'
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
