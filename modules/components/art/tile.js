import React, { Component } from 'react';

export class Tile extends Component {

    canvasRef = (node) => {
        if (node) {
            this.node = node;
            this.ctx = node.getContext('2d');
            this.ctx.imageSmoothingEnabled = false;
            // set alpha
            let buffer = this.ctx.getImageData(0, 0, 8, 8);
            buffer.data.fill(255);
            this.ctx.putImageData(buffer, 0, 0);
            this.renderCanvas();
        }
    };

    renderCanvas = (props = this.props) => {
        const { data, palette } = props;

        let buffer = this.ctx.getImageData(0, 0, 8, 8);

        for (let i = 0, j = 0; i < data.length; i++, j+=4) {
            buffer.data[j] = palette[data[i]][0];
            buffer.data[j+1] = palette[data[i]][1];
            buffer.data[j+2] = palette[data[i]][2];
            // j+3 is alpha
        }

        this.ctx.putImageData(buffer, 0, 0);
    }


    componentWillReceiveProps(newProps) {
        const { data, palette } = this.props;

        // diff the new pixels
        for (let i = 0; i < newProps.data.length; i++) {
            if (newProps.palette[newProps.data[i]] !== palette[data[i]]) {
                break;
            }
            else if (i === newProps.data.length - 1) {
                return;
            }
        }
        this.renderCanvas(newProps);
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        const { data, palette, scale = 4 } = this.props;
        return (
            <canvas
                className="tile"
                width="8"
                height="8"
                ref={this.canvasRef}
                style={{
                    width: 8 * scale,
                    height: 8 * scale,
                }}
            />
        );
    }

}
