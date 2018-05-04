import React, { Component } from 'react';
import { extname } from 'path';
import { observer } from 'mobx-react';
import {Collapse} from 'react-collapse';
import { Item, Input, File, Select, Editor } from '#ui';
import { mappingFormats, dplcFormats } from '#formats/definitions';
import { compressionFormats } from '#formats/compression';
import { environment } from '#store/environment';
const compressionList = Object.keys(compressionFormats);
const mappingList = [...Object.keys(mappingFormats), 'Custom'];
const dplcList = [...Object.keys(dplcFormats), 'Custom'];
const paletteLengths = '1234'.split``.map((d) => ({label: d, value: +d}));

@observer
export class ObjectConfig extends Component {

    state = { open: false, confirmDelete: false, loading: false, saving: false };
    mounted = true;

    load = () => {
        this.setState({loading: true});
        environment.config.currentObject = this.props.index;
        requestIdleCallback(() => {
            this.props.obj.load(() => {
                this.setState({loading: false});
            });
        });
    };
    save = () => {
        this.setState({saving: true});
        requestIdleCallback(() => {
            this.props.obj.save(() => {
                this.setState({saving: false});
            });
        });
    };

    onToggle = () => {
        this.setState({open: !this.state.open});
    }

    confirmDelete = () => {
        const { confirmDelete } = this.state;
        if (confirmDelete) {
            this.props.obj.remove();
        }
        else {
            this.setState({confirmDelete: true});
            setTimeout(() => {
                this.mounted &&
                this.setState({confirmDelete: false});
            }, 1000);
        }
    };

    componentWillUnmount() {
        this.mounted = false;
    }

    render() {
        const { obj } = this.props;
        const { open, confirmDelete, loading, saving } = this.state;

        return <div>
                <div className="row object-header">
                    {obj.name ? (
                        <Item color="blue">
                            {obj.name}
                        </Item>
                    ) : (
                        <Item color="grey">
                            (unnamed)
                        </Item>
                    )}
                    <div className="row-gap">
                        <Item inverted color="blue" onClick={this.onToggle}>
                            {open ? 'Hide Config' : 'Show Config'}
                        </Item>
                        <Item color="green" inverted onClick={this.load}>
                            {loading ? 'Loading...' : 'Load Data'}
                        </Item>
                        <Item color="orange" inverted onClick={this.save}>
                            {saving ? 'Saving...' : 'Save Data'}
                        </Item>
                    </div>
                </div>
                <Collapse isOpened={open}>
                    <div style={{paddingBottom: 5}}>
                        <div className="config">
                            <Item color="blue">
                                Object
                            </Item>
                            <div className="actions">
                                <span>Name</span>
                                <Input
                                    store={obj}
                                    accessor="name"
                                    placeholder="Object Name"
                                />
                            </div>

                            <Item color="green">
                                Art
                            </Item>
                            <div className="options">
                                <Select
                                    label="Compression"
                                    options={compressionList}
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
                                {extname(obj.mappings.path) == '.asm' && (
                                    <Input
                                        containerClass="row-input"
                                        label="Label"
                                        store={obj.mappings}
                                        accessor="label"
                                        placeholder="Label Name"
                                    />
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
                                        {label: 'Yes', value: true},
                                        {label: 'No', value: false},
                                    ]}
                                    store={obj.dplcs}
                                    accessor="enabled"
                                />
                                {obj.dplcs.enabled && (
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
                                        {extname(obj.dplcs.path) == '.asm' && (
                                            <Input
                                                containerClass="row-input"
                                                label="Label"
                                                store={obj.dplcs}
                                                accessor="label"
                                                placeholder="Label Name"
                                            />
                                       )}
                                        <File
                                            store={obj.dplcs}
                                            accessor="path"
                                        />
                                    </div>
                                )}
                            </div>

                            <Item color="magenta">
                                Palettes
                            </Item>
                            <div className="options">
                                {obj.palettes.map((palette, i) => {
                                    const {path, length} = palette;

                                    return <div key={i}>
                                        <div className="file row">
                                            Path
                                            <div>
                                                {path}
                                                <span
                                                    onClick={() => {
                                                        obj.palettes.splice(i, 1);
                                                    }}
                                                    className="clear"
                                                >
                                                    &nbsp;(clear)
                                                </span>
                                            </div>
                                        </div>
                                        <Select
                                            label="Lines"
                                            options={paletteLengths}
                                            store={palette}
                                            accessor="length"
                                            flipScroll
                                        />
                                    </div>;
                                })}
                                {obj.linesLeft > 0 && <File
                                    onChange={(path) => {
                                        obj.palettes.push({
                                            path,
                                            length: 1,
                                        });
                                    }}
                                />}
                            </div>
                            <Item color="orange">
                                Animations
                            </Item>
                            <div className="options">
                                <File
                                    store={obj.animations}
                                    accessor="path"
                                />
                            </div><div className="actions">
                                <span>Prefix</span>
                                {
                                    // Not the best place to store this, but
                                    // I don't know how to access this from environment
                                }
                                <Input
                                    store={environment.config}
                                    accessor="animPrefix"
                                    placeholder="ObjXX"
                                />
                            </div>

                            <Item
                                color="red"
                                inverted
                                onClick={this.confirmDelete}
                            >
                                {confirmDelete ? 'Are you sure?' : 'Delete Object'}
                            </Item>
                        </div>
                    </div>
                </Collapse>
            </div>;
    }

}
