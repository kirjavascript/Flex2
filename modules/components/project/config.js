import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { project } from '#store/project';
import { workspace } from '#store/workspace';
import { ObjectConfig } from './object';
import { Item, Input, File, Select, Editor } from '#ui';

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
                        <ObjectConfig obj={obj} key={obj.key}/>
                    ))}
                </div>}

        </div>;
    }

}
