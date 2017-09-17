import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { environment } from '#store/environment';
import { Select } from '#ui';

import { Mapping } from './mapping';

@observer
export class Mappings extends Component {

    render() {

        const { buffer, index, mappings } = environment.currentSprite;

        return <div className="mappings">
            <div className="mappingContainer">
                {mappings.reverse().map((mapping, mappingIndex) => {
                    return <div
                        key={mappingIndex}
                        style={{zIndex: mappingIndex}}
                    >
                        <Mapping
                            data={mapping}
                            tileBuffer={buffer}
                            scale={4}
                        />
                    </div>;
                })}
            </div>

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
        </div>;
    }

}
