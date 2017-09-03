import React, { Component } from 'react';
import SVARS from 'sass-variables-loader!#styles/variables.scss';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { Item } from '#ui';

const { dialog } = require('electron').remote;

@observer
export class File extends Component {

    state = {
        dragging: false,
    };

    onClick = () => {
        const { store, accessor } = this.props;
        dialog.showOpenDialog({
            title: 'Open Project',
            properties: ['openFile'],
            filters: [
                {name: 'Art Binary', extensions: ['bin']},
                {name: 'All Files', extensions: ['*']},
            ],
        }, (paths) => {
            if (paths) {
                store[accessor] = workspace.relativePath(paths[0]);
            }
        });
    }

    onEmpty = () => {
        const { store, accessor } = this.props;
        store[accessor] = '';
    };

    onDragOver = () => {
        this.setState({dragging: true});
    }
    onDragLeave = () => {
        this.setState({dragging: false});
    }
    onDrop = (e) => {
        e.preventDefault();

        const { store, accessor } = this.props;
        const { path } = e.dataTransfer.files[0];
        store[accessor] = workspace.relativePath(path);

        this.onDragLeave();
        return false;
    }

    render() {
        const { store, accessor, ...otherProps } = this.props;
        const { dragging } = this.state;

        return <div className="file" {...otherProps}>
            { do {
                if (store[accessor]) {
                    <div className="row">
                        Path
                        <div>
                            {store[accessor]}
                            <span onClick={this.onEmpty} className="clear">
                                &nbsp;(clear)
                            </span>
                        </div>
                    </div>;
                }
                else {
                    <div
                        className={`dropzone ${dragging && 'dragging'}`}
                        onClick={this.onClick}
                        onDragOver={this.onDragOver}
                        onDragLeave={this.onDragLeave}
                        onDrop={this.onDrop}
                    >
                        Click or drag files
                    </div>;
                }
            }}


        </div>;
    }

}
