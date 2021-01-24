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
            title: `Choose ${this.props.label}`,
            properties: ['openFile'],
        })
            .then(({ filePaths: [path] }) => path && this.update(path))
            .catch(console.error);
    }

    openDirectory = () => {
        dialog.showOpenDialog({
            title: `New ${this.props.label} Location`,
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
        const { store, accessor, absolute } = this.props;
        const finalPath = absolute ? path : workspace.relativePath(path);
        if (store && accessor) {
            store[accessor] = path ? finalPath : '';
        }

        this.props.onChange &&
        this.props.onChange(finalPath);
    };

    render() {
        const { label, store, accessor, absolute, ...otherProps } = this.props;
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
                        <div
                            className={`dropzone ${dragging && 'dragging'}`}
                            onClick={this.openFile}
                            onDragOver={this.onDragOver}
                            onDragLeave={this.onDragLeave}
                            onDrop={this.onDrop}
                        >
                            click / drag file
                        </div>
                    </>
                )}


        </div>;
    }

}
