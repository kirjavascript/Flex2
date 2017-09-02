import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { project } from '#store/project';
import { workspace } from '#store/workspace';
import { Item, Input, File } from '#ui';

@observer
export class ProjectConfig extends Component {

    render() {
        return <div className="project-config">
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
                                <Item color="green">
                                    Art
                                </Item>
                                <div className="options">
                                    <File
                                        store={obj.art}
                                        accessor="path"
                                    />
   </div>
                                <Item color="yellow">
                                    Mappings
                                </Item>
                                <Item color="red">
                                    DPLCS
                                </Item>
                                <Item color="red" inverted onClick={obj.remove}>
                                    Delete Object
                                </Item>
                            </div>
                        </div>
                    ))}
                </div>}


        </div>;
    }

}
