import React, { Component } from 'react';
import ace from 'brace';
import 'brace/keybinding/vim';
import './theme';
import './syntax';
import { autorun } from 'mobx';

export class Editor extends Component {

    constructor(props) {
        super(props);

        this.id = 'editor-' + Math.random().toString(35).slice(2);
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

            // editor.setKeyboardHandler('ace/keyboard/vim');
            // editor.setKeyboardHandler(null);

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
