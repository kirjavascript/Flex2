import React, { useState } from 'react';
import { observer } from 'mobx-react';
import { Item, Input } from '~/ui';
import { environment } from '~/store/environment';

export const MetadataEditor = observer(() => {
    const { currentSprite } = environment;
    const { mappings, dplcs, metadata, index } = currentSprite;
    const dplcsEnabled = environment.config.dplcsEnabled;

    return (
        <div className="raw-editor">
            <SpriteMetadata metadata={metadata} index={index} />
            {mappings && mappings.length > 0 && (
                <PieceSection pieces={mappings} label="Mapping" />
            )}
            {dplcsEnabled && dplcs && dplcs.length > 0 && (
                <PieceSection pieces={dplcs} label="DPLC" />
            )}
        </div>
    );
});

const SpriteMetadata = observer(({ metadata, index }) => {
    const keys = metadata ? Object.keys(metadata) : [];

    return (
        <div className="metadata-piece">
            <div className="metadata-header">
                <Item color="blue">Sprite 0x{index.toString(16).toUpperCase()}</Item>
                <AddKey meta={metadata} />
            </div>
            {keys.length > 0 && (
                <MetadataTable meta={metadata} keys={keys} />
            )}
        </div>
    );
});

const PieceSection = observer(({ pieces, label }) => {
    const hasMetadata = pieces.some(p => p.metadata && Object.keys(p.metadata).length > 0);
    const [expanded, setExpanded] = useState(hasMetadata);

    return (
        <div className="metadata-piece">
            <div className="metadata-header">
                <Item
                    color="grey"
                    onClick={() => setExpanded(!expanded)}
                    style={{ cursor: 'pointer' }}
                >{expanded ? '▼' : '▶'} {label} Metadata</Item>
            </div>
            {expanded && pieces.map((piece, i) => {
                if (!piece.metadata) piece.metadata = {};
                const meta = piece.metadata;
                const keys = Object.keys(meta);

                return (
                    <div key={i} className="metadata-sub-piece">
                        <div className="metadata-header">
                            <Item color="white2">{label} 0x{i.toString(16).toUpperCase()}</Item>
                            <AddKey meta={meta} />
                        </div>
                        {keys.length > 0 && (
                            <MetadataTable meta={meta} keys={keys} />
                        )}
                    </div>
                );
            })}
        </div>
    );
});

const MetadataTable = observer(({ meta, keys }) => (
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
));

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
