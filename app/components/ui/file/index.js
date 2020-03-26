import React, { Component } from 'react';
import SVARS from '!!sass-variables-loader!#styles/variables.scss';
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
        }, (paths) => {
            if (paths) {
                this.update(paths[0]);
            }
        }); }

    onEmpty = () => {
        this.update(void 0);
    };

    onDragOver = () => {
        this.setState({dragging: true});
    }
    onDragLeave = () => {
        this.setState({dragging: false});
    }
    onDrop = (e) => {
        e.preventDefault();

        const { path } = e.dataTransfer.files[0];
        this.update(path);
        this.onDragLeave();
        return false;
    }

    update = (path) => {
        const { store, accessor } = this.props;
        if (store && accessor) {
            store[accessor] = path ? workspace.relativePath(path) : (store.accessor = ''); // TODO: this looks wrong
        }

        this.props.onChange &&
        this.props.onChange(workspace.relativePath(path));
    };

    render() {
        const { label, store, accessor, ...otherProps } = this.props;
        const { dragging } = this.state;

        return <div className="file" {...otherProps}>
            { accessor && store[accessor] ? (<div className="row">
                    Path
                    <div>
                        {store[accessor]}
                        <span onClick={this.onEmpty} className="clear">
                            &nbsp;(clear)
                        </span>
                    </div>
                </div>
                ) : (
                    <div
                        className={`dropzone ${dragging && 'dragging'}`}
                        onClick={this.onClick}
                        onDragOver={this.onDragOver}
                        onDragLeave={this.onDragLeave}
                        onDrop={this.onDrop}
                    >
                        {label || 'Click or drag files'}
                    </div>
                )}


        </div>;
    }

}
