import React from 'react';
import { observer } from 'mobx-react';
import { observable, action } from 'mobx';
import classNames from 'classnames';
import { clipboard } from 'electron';
import { Button } from '~/ui';

const state = observable({ id: 0, text: '', kind: 'info', copied: false });
let timer;

// returns an updater that does nothing once a newer toast has replaced this one
export const toast = action((text, kind = 'info') => {
    const id = ++state.id;
    const update = action((text, kind = 'info') => {
        if (id !== state.id) return;
        clearTimeout(timer);
        state.text = text;
        state.kind = kind;
        state.copied = false;
        // errors stay until clicked
        if (kind !== 'pending' && kind !== 'error') {
            timer = setTimeout(dismiss, 2000);
        }
    });
    update(text, kind);
    return update;
});

const dismiss = action(() => {
    clearTimeout(timer);
    state.text = '';
});

const copy = action((e) => {
    e.stopPropagation();
    clipboard.writeText(state.text);
    state.copied = true;
});

export const Toast = observer(() => {
    if (!state.text) return null;
    return (
        <aside
            className={classNames('toast', `toast--${state.kind}`)}
            onClick={dismiss}
        >
            {state.kind === 'error' && (
                <Button color="red" className="button toast__copy" onClick={copy}>
                    {state.copied ? 'copied' : 'copy'}
                </Button>
            )}
            {state.text}
        </aside>
    );
});
