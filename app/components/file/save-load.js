import React from 'react';
import { Button } from '#ui';

function SaveLoad({ load, save }) {
    return (
        <div className="saveload">
            <Button color="green" onClick={load}>load</Button>
            <Button color="orange" onClick={save}>save</Button>
        </div>
    );
}

SaveLoad.indicator = (e) => {
    if (e) {
        const { textContent } = e.target;
        e.target.textContent = '...';
        e.persist();

        return () => {
            e.target.textContent = textContent;
        };
    }
    return () => {};
};

export default SaveLoad;
