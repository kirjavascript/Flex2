import React, { Component } from 'react';
import ace from 'brace';
import 'brace/keybinding/vim';
import 'brace/mode/assembly_x86';
import './theme.js';
// import { observer } from 'mobx-react';
// import { autorun } from 'mobx';
// https://ace.c9.io/#nav=higlighter&api=editor


// @observer
export class Editor extends Component {

    constructor(props) {
        super(props);

        this.id = 'editor-' + Math.random().toString(35).slice(2);
    }

    onRef = (node) => {
        if (node) {

            let editor = ace.edit(this.id);
            editor.setTheme('ace/theme/flex');
            // editor.getSession().setUseWorker(false);
            editor.$blockScrolling = Infinity;
            editor.getSession().setMode('ace/mode/assembly_x86');

            editor.setShowPrintMargin(false);
            editor.setHighlightActiveLine(false);
            editor.renderer.setScrollMargin(5, 5, 5, 5);

            editor.setOptions({
                fontSize: '14px',
                maxLines: Infinity,
                wrap: true,
            });

            // editor.setKeyboardHandler('ace/keyboard/vim');
            // getValue/setValue
        }
        else {
            // autorun disposer
        }
    };

    render() {
        // const { label, store, accessor, color, ...otherProps } = this.props;

        return <div className="ace-flex-wrap">
            <div id={this.id} ref={this.onRef}/>
        </div>;
    }

}
