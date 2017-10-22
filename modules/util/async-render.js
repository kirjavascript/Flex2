import React, { Component } from 'react';

// unused

export class AsyncRender extends Component {

    state = {
        display: false,
    };

    unmounting = false;

    componentWillUnmount () {
        this.unmounting = true;
    }

    constructor(props) {
        super(props);

        if (this.props.exclude) {
            this.state = { display: true };
        }
        else {
            this.state = { display: false };
            setTimeout(() => {
                !this.unmounting &&
                    this.setState({display: true});
            }, this.props.delay);
        }

    }

    render() {

        return this.state.display && this.props.children;
    }
}
