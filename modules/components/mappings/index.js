import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Select } from '#ui';

@observer
export class Mappings extends Component {

    render() {
        return <pre>
            zoom
            import sprite over active frame

            <Select
                label="Transparency"
                store={environment.config}
                accessor="transparency"
                options={[
                    {label: 'Enabled', value: true},
                    {label: 'Disabled', value: false},
                ]}
            />
            {JSON.stringify(environment.mappings, null, 4)}
        </pre>;
    }

}
