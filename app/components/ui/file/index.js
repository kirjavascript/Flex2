import React, { Component } from 'react';
import { join } from 'path';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { Input, Item } from '#ui';

const { dialog } = require('electron').remote;

@observer
export class File extends Component {
    state = {
        dragging: false,
        filename: '',
        creating: false,
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
        this.update();
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


    create = () => {
        this.setState({
            creating: true,
            filename: `${this.props.label.toLowerCase()}.bin`,
        });
    };

    setFilename = (e) => {
        this.setState({ filename: e.target.value });
    };

    makeFile = () => {
        dialog
            .showOpenDialog({
                title: `New ${this.props.label} Location`,
                properties: ['openDirectory'],
            })
            .then(({ filePaths: [path] }) => {
                if (path) {
                    const finalName = join(path, this.state.filename);
                }
            })
            .catch(console.error);
    };

    cancelFile = () => {
        this.setState({ creating: false });
    };

    fileInputKeyDown = (e) => {
        e.key === 'Escape' && this.cancelFile();
        e.key === 'Enter' && this.makeFile();
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
        const { dragging, filename, creating } = this.state;

        return (
            <div className="file" {...otherProps}>
                {accessor && store[accessor] ? (
                    <div className="row">
                        Path
                        <Input store={store} accessor={accessor} />
                        <span onClick={this.onEmpty} className="clear">
                            &nbsp;(clear)
                        </span>
                    </div>
                ) : (
                    <div className="file-menu">
                        {creating ? (
                            <div className="dashed-box new">
                                <input
                                    value={filename}
                                    onChange={this.setFilename}
                                    onKeyDown={this.fileInputKeyDown}
                                    placeholder="filename"
                                    autoFocus
                                />
                                <Item
                                    inverted
                                    color="red"
                                    onClick={this.cancelFile}
                                >
                                    ✗
                                </Item>
                                <Item
                                    inverted
                                    color="green"
                                    onClick={this.makeFile}
                                >
                                    ✔
                                </Item>
                            </div>
                        ) : (
                            <div
                                className="dashed-box new"
                                onClick={this.create}
                            >
                                create new
                            </div>
                        )}
                        <div
                            className={`dashed-box ${dragging && 'dragging'}`}
                            onClick={this.openFile}
                            onDragOver={this.onDragOver}
                            onDragLeave={this.onDragLeave}
                            onDrop={this.onDrop}
                        >
                            choose file / drop
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
