import React, { Component } from 'react';
import ace from 'brace';
import 'brace/keybinding/vim';
import './theme';
import './syntax';
import { autorun } from 'mobx';
import { resolve }  from 'path';
import { access } from 'fs';
import { uuid } from '#util/uuid';
const { app } = require('electron').remote;

export class Editor extends Component {

    constructor(props) {
        super(props);

        this.id = uuid();
    }

    onRef = (node) => {
        if (node) {
            let editor = ace.edit(this.id);
            editor.setTheme('ace/theme/flex');
            editor.getSession().setMode('ace/mode/flex');
            editor.$blockScrolling = Infinity;
            editor.setShowPrintMargin(false);
            editor.setHighlightActiveLine(false);
            editor.setShowFoldWidgets(false);
            editor.renderer.setScrollMargin(5, 5, 5, 5);

            editor.setOptions({
                fontSize: '14px',
                maxLines: Infinity,
                wrap: true,
            });

            // enable vim mode
            access(resolve(app.getPath('home'), './.vimrc'), (err) => {
                if (!err) {
                    editor.setKeyboardHandler('ace/keyboard/vim');
                }
            });

            const { store, accessor } = this.props;

            if (store && accessor) {
                this.disposer = autorun(() => {
                    this.externalEdit = true;
                    const pos = editor.getCursorPosition();
                    editor.setValue(store[accessor]);
                    editor.clearSelection();
                    editor.moveCursorToPosition(pos);
                    this.externalEdit = false;
                });

                editor.getSession().on('change', (e) => {
                    if (!this.externalEdit) {
                        store[accessor] = editor.getValue();
                    }
                });
            }

        }
        else {
            this.disposer && this.disposer();
        }
    };

    render() {
        return <div id={this.id} ref={this.onRef}/>;
    }

}
