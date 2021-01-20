import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { workspace } from '#store/workspace';
import { Input, Item } from '#ui';

const { dialog } = require('electron').remote;

@observer
export class File extends Component {

    state = {
        dragging: false,
    };

    openFile = () => {
        dialog.showOpenDialog({
            title: `Open ${this.props.label}`,
            properties: ['openFile'],
        })
            .then(({ filePaths: [path] }) => path && this.update(path))
            .catch(console.error);
    }

    openDirectory = () => {
        dialog.showOpenDialog({
            title: `Open ${this.props.label}`,
            properties: ['openDirectory'],
        })
            .then(({ filePaths: [path] }) => path && this.update(path))
            .catch(console.error);
    }

    onEmpty = () => {
        this.update();
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
            store[accessor] = path ? workspace.relativePath(path) : '';
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
                    <Input store={store} accessor={accessor}/>
                    <span onClick={this.onEmpty} className="clear">
                        &nbsp;(clear)
                    </span>
                </div>
                ) : (
                    <>
                        <Item
                            color="blue"
                            inverted
                            onClick={this.openDirectory}
                        >
                            New
                        </Item>
                        <Item
                            color="green"
                            inverted
                            onClick={this.openFile}
                        >
                            Existing
                        </Item>
                        <div
                            className={`dropzone ${dragging && 'dragging'}`}
                            onClick={this.openFile}
                            onDragOver={this.onDragOver}
                            onDragLeave={this.onDragLeave}
                            onDrop={this.onDrop}
                        >
                            {'Drag'}
                        </div>
                    </>
                )}


        </div>;
    }

}
