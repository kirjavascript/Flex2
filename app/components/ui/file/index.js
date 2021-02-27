import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { Input } from '#ui';

const { dialog } = require('electron').remote;

@observer
export class File extends Component {
    state = {
        dragging: false,
    };

    openFile = () => {
        dialog
            .showOpenDialog({
                title: `Choose ${this.props.label}`,
                properties: ['openFile'],
            })
            .then(({ filePaths: [path] }) => path && this.update(path))
            .catch(console.error);
    };

    onEmpty = () => {
        const { store, accessor } = this.props;
        store[accessor] = '';
    };

    onDragOver = () => {
        this.setState({ dragging: true });
    };
    onDragLeave = () => {
        this.setState({ dragging: false });
    };
    onDrop = (e) => {
        e.preventDefault();

        const { path } = e.dataTransfer.files[0];
        this.update(path);
        this.onDragLeave();
        return false;
    };

    createFile = () => {
        dialog.showSaveDialog({
            title: `New ${this.props.label}`,
            defaultPath: `${this.props.label.toLowerCase()}.bin`,
            filters: [{name: `${this.props.label} File`, extensions: ['bin', 'asm']}],
        })
            .then(({ filePath }) => {
                filePath && this.update(filePath);

            })
            .catch(console.error);
    };



    update = (path) => {
        const { store, accessor, absolute } = this.props;
        const finalPath = absolute ? path : workspace.relativePath(path);
        if (store && accessor) {
            store[accessor] = path ? finalPath : '';
        }

        this.props.onChange && this.props.onChange(finalPath);
    };

    render() {
        const { label, store, accessor, absolute, ...otherProps } = this.props;
        const { dragging } = this.state;

        return (
            <div className="file" {...otherProps}>
                {accessor && store[accessor] ? (
                    <div className="file-info">
                        <Input
                            store={store}
                            accessor={accessor}
                            className={dragging ? 'dragging' : ''}
                            onDragOver={this.onDragOver}
                            onDragLeave={this.onDragLeave}
                            onDrop={this.onDrop}
                        />
                        <span
                            onClick={this.onEmpty}
                            className="clear"
                        >
                            &nbsp;(clear)
                        </span>
                    </div>
                ) : (
                    <div className="file-menu">
                        <div
                            className="dashed-box new"
                            onClick={this.createFile}
                        >
                            create new
                        </div>
                        <div
                            className={`dashed-box ${dragging && 'dragging'}`}
                            onClick={this.openFile}
                            onDragOver={this.onDragOver}
                            onDragLeave={this.onDragLeave}
                            onDrop={this.onDrop}
                        >
                            choose file / drop
                        </div>
                        {this.props.children}
                    </div>
                )}
            </div>
        );
    }
}
