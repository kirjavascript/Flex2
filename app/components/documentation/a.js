import { shell } from 'electron';

import React, { Component } from 'react';

export class A extends Component {

    onClick = (e) => {
        e.preventDefault();
        shell.openExternal(this.props.href);
    };

    render() {
        return <a {...this.props} href="#" onClick={this.onClick}/>;
    }

}
