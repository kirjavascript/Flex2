import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';

@observer
export class DPLCs extends Component {

    render() {
        return <pre>
            <div>(maybe move into mappings)</div>
            {JSON.stringify(environment.dplcs, null, 4)}
        </pre>;
    }

}
