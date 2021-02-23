import React from 'react';
import { Item } from '#ui';

function ErrorMsg({ error }) {
    return (
        !!error &&
        <div className="menu-item">
            <Item color="red">{error.name}: {error.message}</Item>
        </div>
    );
}

export default ErrorMsg;
