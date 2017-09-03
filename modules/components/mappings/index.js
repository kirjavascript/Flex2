import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';

@observer
export class Mappings extends Component {

    render() {
        return <pre>
            {JSON.stringify(environment.mappings, null, 4)}
        </pre>;
    }

}
