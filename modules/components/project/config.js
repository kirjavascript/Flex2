import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { project } from '#store/project';
import { workspace } from '#store/workspace';
import { Item, Input, File, Select, Editor } from '#ui';

@observer
export class ProjectConfig extends Component {

    render() {
        return <div className="project-config">
                <Editor/>

                <h1>{project.name}</h1>

                <div className="row">
                    <Input
                        label="Project Name"
                        placeholder="Project Name..."
                        store={project}
                        accessor="name"
                    />

                    <Item color="blue" onClick={project.newObject} inverted>
                        New Object
                    </Item>
                    <Item color="magenta" inverted onClick={workspace.closeProject}>
                        Close Project
                    </Item>

                </div>

                {!!project.objects.length && <div className="panel">
                    {project.objects.map((obj) => (
                        <div key={obj.key}>
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
                                        options={[
                                            'Sonic 1',
                                            'Sonic 2',
                                            'Sonic 3&K',
                                            'Custom',
                                        ]}
                                        store={obj.mappings}
                                        accessor="format"
                                    />
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
                                                options={[
                                                    'Sonic 1',
                                                    'Sonic 2',
                                                    'Sonic 3&K',
                                                    'Sonic CD',
                                                    'Custom...',
                                                ]}
                                                store={obj.dplcs}
                                                accessor="format"
                                            />
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
                        </div>
                    ))}
                </div>}


        </div>;
    }

}
