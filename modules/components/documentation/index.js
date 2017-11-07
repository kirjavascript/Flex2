import React, { Component } from 'react';
import README from '../../../README.md';
import marked from 'marked';
import { Version } from './version';

const docs = {__html: marked(README.split('(__docs__)').pop())};

export class Documentation extends Component {

    render() {
        return <div className="documentation">
            <h1>Flex 2</h1>
            <Version/>
            <br/>
            <div
                dangerouslySetInnerHTML={docs}
            />
        </div>;
    }

}
