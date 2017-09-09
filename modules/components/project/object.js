import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { Item, Input, File, Select, Editor } from '#ui';
import { mappingFormats, dplcFormats } from '#formats/definitions';
const mappingList = [...Object.keys(mappingFormats), 'Custom'];
const dplcList = [...Object.keys(dplcFormats), 'Custom'];

@observer
export class ObjectConfig extends Component {

    render() {
        const { obj } = this.props;

        return <div>
                <div className="row object-header">
                    <Item color="blue">
                        Object
                    </Item>
                    <Input
                        store={obj}
                        color="blue"
                        accessor="name"
                        placeholder="Object Name"
                    />
               </div>
                <div className="indent">
                    <Item color="magenta">
                        Palettes
                    </Item>
                    <Item color="green">
                        Art
                    </Item>
                    <div className="options">
                        <Select
                            label="Compression"
                            options={[
                                'Uncompressed',
                                'Nemesis',
                                'Kosinski',
                                'Kosinski-M',
                                'Comper',
                            ]}
                            store={obj.art}
                            accessor="compression"
                        />
                        <File
                            store={obj.art}
                            accessor="path"
                        />
                    </div>
                    <Item color="yellow">
                        Mappings
                    </Item>
                    <div className="options">
                        <Select
                            label="Format"
                            options={mappingList}
                            store={obj.mappings}
                            accessor="format"
                        />
                        {obj.mappings.format == 'Custom' && (
                            <div className="custom">
                                <div className="preset">
                                    <div>Load preset</div>
                                    <div>
                                        {Object
                                            .keys(mappingFormats)
                                            .map((format) => (
                                            <a
                                                href="#"
                                                key={format}
                                                onClick={() => {
                                                    obj.mappings.customDefinition = mappingFormats[format];
                                                }}
                                            >
                                                {format}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                                <Editor
                                    store={obj.mappings}
                                    accessor="customDefinition"
                                />
                            </div>
                        )}
                        <File
                            store={obj.mappings}
                            accessor="path"
                        />
                    </div>
                    <Item color="red">
                        DPLCS
                    </Item>
                    <div className="options">
                        <Select
                            label="Enabled"
                            options={[
                                'Yes',
                                'No',
                            ]}
                            store={obj.dplcs}
                            accessor="enabled"
                        />
                        {obj.dplcs.enabled == 'Yes' && (
                            <div>
                                <Select
                                    label="Format"
                                    options={dplcList}
                                    store={obj.dplcs}
                                    accessor="format"
                                />

                                {obj.dplcs.format == 'Custom' && (
                                    <div className="custom">
                                        <div className="preset">
                                            <div>Load preset</div>
                                            <div>
                                                {Object
                                                    .keys(dplcFormats)
                                                    .map((format) => (
                                                    <a
                                                        href="#"
                                                        key={format}
                                                        onClick={() => {
                                                            obj.dplcs.customDefinition = dplcFormats[format];
                                                        }}
                                                    >
                                                        {format}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                        <Editor
                                            store={obj.dplcs}
                                            accessor="customDefinition"
                                        />
                                    </div>
                                )}
                                <File
                                    store={obj.dplcs}
                                    accessor="path"
                                />
                            </div>
                        )}
                    </div>
                    <div className="actions">
                        <Item color="red" inverted onClick={obj.remove}>
                            Delete Object
                        </Item>
                        <div>
                            <Item color="green" inverted onClick={obj.load}>
                                Load Object
                            </Item>
                            <Item color="green" inverted onClick={obj.save}>
                                Save To Object
                            </Item>
                        </div>
                    </div>
                </div>
            </div>;
    }

}
