import React, { useState, useEffect } from 'react';
import { Item } from '#ui';

const MAX_LINES = 8;

function ErrorMsg({ error }) {
    const [expanded, setExpanded] = useState(false);

    useEffect(() => { setExpanded(false); }, [error]);

    if (!error) return null;

    const lines = error.message.split('\n');
    const truncated = lines.length > MAX_LINES && !expanded;
    const visibleLines = truncated ? lines.slice(0, MAX_LINES) : lines;

    return (
        <div className="menu-item">
            <Item color="red">
                {error.name}:{' '}
                {visibleLines
                    .reduce((acc, cur, i) => [...acc, <br key={i} />, cur])}
                <br />
                {truncated && (
                    <a
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setExpanded(true)}
                    >
                        ... click to show {lines.length - MAX_LINES} more lines
                    </a>
                )}
            </Item>
        </div>
    );
}

export default ErrorMsg;
