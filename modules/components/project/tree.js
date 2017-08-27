import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { project } from '#store/project';
import { workspace } from '#store/workspace';
import { Indent, Item } from './tree-ui';
import { toJS } from 'mobx';
// http://chenglou.github.io/react-motion/demos/demo8-draggable-list/
// + computed flatten
@observer
export class ProjectTree extends Component {

    render() {
        return <div className="project-tree">
            <div>
                <Item color="magenta" prefix="Project">
                    {project.name}
                </Item>

                <div className="indent">
                    {project.objects.map((obj) => (
                        <div key={Math.random()}>
                            <Item color="blue">
                                Object
                            </Item>
                            <div className="indent">
                                <Item color="green">
                                    Art
                                </Item>
                                <Item color="yellow">
                                    Mappings
                                </Item>
                                <Item color="red">
                                    DPLCS
                                </Item>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
            <div>
                <Item prefix="+" onClick={project.newObject}>
                    new object
                </Item>
                <Item color="magenta" onClick={workspace.closeProject}>
                    Close Project
                </Item>
            </div>
        </div>;
    }

}
