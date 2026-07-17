import React from 'react';
import { observer } from 'mobx-react';
import { Item, Input, Button } from '#ui';
import { environment } from '#store/environment';

export const MetadataEditor = observer(() => {
    const { currentSprite } = environment;
    const { mappings, dplcs } = currentSprite;
    const dplcsEnabled = environment.config.dplcsEnabled;

    const pieces = dplcsEnabled && dplcs ? dplcs : mappings;

    if (!pieces || !pieces.length) {
        return <div className="metadata-editor"><Item>No mappings loaded</Item></div>;
    }

    return (
        <div className="metadata-editor" style={{ overflow: 'auto', height: '100%' }}>
            {pieces.map((piece, i) => {
                const meta = piece.metadata;
                if (!meta) return null;
                const keys = Object.keys(meta);
                if (!keys.length) return (
                    <div key={i} className="metadata-piece">
                        <Item color="grey">
                            {dplcsEnabled ? 'DPLC' : 'Mapping'} {i} — no metadata
                        </Item>
                        <div className="menu-item">
                            <AddKey meta={meta} />
                        </div>
                    </div>
                );

                return (
                    <div key={i} className="metadata-piece">
                        <Item color="blue">
                            {dplcsEnabled ? 'DPLC' : 'Mapping'} {i}
                        </Item>
                        <table className="metadata-table">
                            <thead>
                                <tr>
                                    <th>Key</th>
                                    <th>Value</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map(key => (
                                    <tr key={key}>
                                        <td><Item>{key}</Item></td>
                                        <td>
                                            <Input
                                                isNumber
                                                store={meta}
                                                accessor={key}
                                            />
                                        </td>
                                        <td>
                                            <Button
                                                color="red"
                                                onClick={() => { delete meta[key]; }}
                                            >×</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="menu-item">
                            <AddKey meta={meta} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

const AddKey = observer(({ meta }) => {
    const [adding, setAdding] = React.useState(false);
    const [newKey, setNewKey] = React.useState('');

    if (!adding) {
        return (
            <Button onClick={() => setAdding(true)}>
                + Add Field
            </Button>
        );
    }

    return (
        <span>
            <input
                type="text"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="key name"
                autoFocus
                onKeyDown={e => {
                    if (e.key === 'Enter' && newKey.trim()) {
                        meta[newKey.trim()] = 0;
                        setNewKey('');
                        setAdding(false);
                    }
                    if (e.key === 'Escape') {
                        setNewKey('');
                        setAdding(false);
                    }
                }}
            />
            <Button onClick={() => {
                if (newKey.trim()) {
                    meta[newKey.trim()] = 0;
                    setNewKey('');
                    setAdding(false);
                }
            }}>OK</Button>
            <Button onClick={() => { setNewKey(''); setAdding(false); }}>Cancel</Button>
        </span>
    );
});
