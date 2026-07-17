import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, Button } from '#ui';
import { environment } from '#store/environment';

export const MetadataEditor = observer(() => {
    const { currentSprite } = environment;
    const { mappings, dplcs } = currentSprite;
    const dplcsEnabled = environment.config.dplcsEnabled;

    if ((!mappings || !mappings.length) && (!dplcs || !dplcs.length)) {
        return (
            <div className="raw-editor">
                <Item>No mappings loaded</Item>
            </div>
        );
    }

    return (
        <div className="raw-editor">
            {mappings && mappings.map((piece, i) => (
                <MetadataPiece
                    key={`m${i}`}
                    piece={piece}
                    index={i}
                    label="Mapping"
                />
            ))}
            {dplcsEnabled && dplcs && dplcs.map((piece, i) => (
                <MetadataPiece
                    key={`d${i}`}
                    piece={piece}
                    index={i}
                    label="DPLC"
                />
            ))}
        </div>
    );
});

const MetadataPiece = observer(({ piece, index, label }) => {
    const meta = piece.metadata;
    const keys = meta ? Object.keys(meta) : [];

    return (
        <div className="metadata-piece">
            <div className="metadata-header">
                <Item color="blue">{label} {index}</Item>
                <AddKey meta={meta} />
            </div>
            {keys.length > 0 && (
                <table className="metadata-table">
                    <tbody>
                        {keys.map(key => (
                            <tr key={key}>
                                <td className="metadata-label">{key}</td>
                                <td className="metadata-value">
                                    <Input
                                        store={meta}
                                        accessor={key}
                                    />
                                </td>
                                <td className="metadata-action">
                                    <Item
                                        inverted
                                        color="red"
                                        onClick={() => { delete meta[key]; }}
                                    >×</Item>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
});

const AddKey = ({ meta }) => {
    const [adding, setAdding] = useState(false);
    const [newKey, setNewKey] = useState('');

    if (!adding) {
        return (
            <Item
                inverted
                color="green"
                onClick={() => setAdding(true)}
            >+</Item>
        );
    }

    return (
        <input
            type="text"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="key"
            autoFocus
            style={{ width: 80 }}
            onKeyDown={e => {
                if (e.key === 'Enter' && newKey.trim()) {
                    meta[newKey.trim()] = '';
                    setNewKey('');
                    setAdding(false);
                }
                if (e.key === 'Escape') {
                    setNewKey('');
                    setAdding(false);
                }
            }}
            onBlur={() => {
                if (newKey.trim()) {
                    meta[newKey.trim()] = '';
                }
                setNewKey('');
                setAdding(false);
            }}
        />
    );
};
