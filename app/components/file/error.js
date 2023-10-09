import React from 'react';
import { Item } from '#ui';

function ErrorMsg({ error }) {
    return (
        !!error && (
            <div className="menu-item">
                <Item color="red">
                    {error.name}:{' '}
                    {error.message
                        .split('\n')
                        .reduce((acc, cur, i) => [...acc, <br key={i} />, cur])}
                    <br />
                </Item>
            </div>
        )
    );
}

export default ErrorMsg;
