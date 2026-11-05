import React, { useRef, useState } from 'react';
import SVARS from 'sass-variables';
import { observer } from 'mobx-react';
import { commands } from '~/controls/commands';
import { keymap, generalBindings, eventToKey, modifierFromEvent } from '~/store/keymap';
import { Button } from '~/ui';

const countsError = 'digit keys can\'t be used while "Use number keys as command multipliers" is enabled';

const labels = { '[mode]': 'Toggle Mode', '[dplcs]': 'Toggle DPLCs' };
const label = ({ name }) => labels[name] || name;

const allBindings = () => [...commands.flat(), ...generalBindings];

// ids clashing with each binding
function findConflicts() {
    const coarse = keymap.combo('coarse');
    const global = [];
    commands.flat().forEach(({ id, hasShift }) => {
        const combo = keymap.combo(id);
        if (!combo || keymap.blocked(combo)) return;
        global.push({ id, combo });
        if (hasShift && coarse) global.push({ id, combo: `${coarse}+${combo}` });
    });
    const clashes = {};
    global.forEach((a) => global.forEach((b) => {
        if (a.id === b.id) return;
        const prefix = (x, y) => y.startsWith(x + ' ');
        if (a.combo === b.combo || prefix(a.combo, b.combo) || prefix(b.combo, a.combo)) {
            (clashes[a.id] = clashes[a.id] || new Set()).add(b.id);
        }
    }));
    return clashes;
}

const KeyCapture = observer(({ binding, setError }) => {
    const { id, modifier, hasShift } = binding;
    const steps = useRef(null);
    const button = useRef();
    const [, rerender] = useState(0);

    const stop = (save) => {
        if (save && steps.current?.length) keymap.set(id, steps.current.join(' '));
        steps.current = null;
        keymap.setRecording(false);
        rerender((n) => n + 1);
    };

    const start = () => {
        steps.current = [];
        keymap.setRecording(true);
        setError('');
        rerender((n) => n + 1);
        button.current.focus();
    };

    // enter confirms and esc cancels, so neither can be bound. leaving the
    // field confirms too
    const onKeyDown = (e) => {
        if (!steps.current) return;
        e.preventDefault();
        if (e.key === 'Enter' || e.key === 'Escape') {
            stop(e.key === 'Enter');
            return button.current.blur();
        }
        if (modifier) {
            const key = modifierFromEvent(e);
            if (key) { steps.current = [key]; rerender((n) => n + 1); }
            return;
        }
        const key = eventToKey(e);
        if (!key) return;
        if (keymap.counts && /^\d$/.test(key)) return setError(countsError);
        const coarse = keymap.combo('coarse');
        if (hasShift && key.split('+').includes(coarse)) {
            return setError(`${coarse} is the coarse step for this`);
        }
        steps.current = [...steps.current, key];
        rerender((n) => n + 1);
    };

    const recording = steps.current !== null;
    const combo = keymap.combo(id);

    return (
        <div className="key-capture">
            <button
                ref={button}
                className={recording ? 'key recording' : 'key'}
                onClick={() => !recording && start()}
                onKeyDown={onKeyDown}
                onBlur={() => recording && stop(true)}
            >
                {recording
                    ? (steps.current.join(' ') || (modifier ? 'press a modifier' : 'press keys')) + ' ⏎'
                    : combo || '—'}
            </button>
            <span className="slot">
                <Button title="unbind" onClick={() => { keymap.set(id, ''); setError(''); }}>×</Button>
            </span>
            <span className="slot">
                <Button title="reset to default" onClick={() => { keymap.reset(id); setError(''); }}>↺</Button>
            </span>
        </div>
    );
});

const KeyRow = observer(({ binding, clashes }) => {
    const [error, setError] = useState('');
    return (
        <div className="setting-row">
            <div className="key-label">
                <span style={{ color: SVARS[binding.color || 'white'] }}>{label(binding)}</span>
                {clashes && <div className="key-error">clashes with {clashes}</div>}
                {keymap.blocked(keymap.combo(binding.id)) && (
                    <div className="key-error">inactive: {countsError}</div>
                )}
                {error && <div className="key-error">{error}</div>}
            </div>
            <KeyCapture binding={binding} setError={setError} />
        </div>
    );
});

export const Keys = observer(() => {
    const [resets, setResets] = useState(0);
    const conflicts = findConflicts();
    const names = Object.fromEntries(allBindings().map((b) => [b.id, label(b)]));

    return (
        <div className="keys">
            <hr />
            <div className="keys-header">
                <span>Keybindings</span>
                <Button
                    color="magenta"
                    onClick={() => { keymap.resetAll(); setResets((n) => n + 1); }}
                >
                    reset all
                </Button>
            </div>
            {[...commands, generalBindings].map((group, i) => (
                <div className="key-group" key={i}>
                    {group.map((binding) => (
                        <KeyRow
                            key={`${binding.id}-${resets}`}
                            binding={binding}
                            clashes={conflicts[binding.id]
                                && [...conflicts[binding.id]].map((c) => names[c]).join(', ')}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
});
