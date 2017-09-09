import React, { Component } from 'react';
import { environment } from '#store/environment';
import { autorun } from 'mobx';

export class Tile extends Component {

    canvasRef = (node) => {
        if (node) {
            this.node = node;
            this.ctx = node.getContext('2d');
            this.ctx.imageSmoothingEnabled = false;
            this.buffer = this.ctx.getImageData(0, 0, 8, 8);
            // set alpha
            this.buffer.data.fill(255);
            this.ctx.putImageData(this.buffer, 0, 0);
            this.renderCanvas();
            // rerender if transparency changes (no diffing)
            this.disposer = autorun(() => {
                environment.config.transparency;
                this.renderCanvas();
            });
        }
        else {
            this.disposer();
        }
    };

    renderCanvas = (props = this.props) => {
        const { data, palette } = props;
        const { transparency } = environment.config;

        for (let i = 0, j = 0; i < data.length; i++, j+=4) {
            this.buffer.data[j] = palette[data[i]][0];
            this.buffer.data[j+1] = palette[data[i]][1];
            this.buffer.data[j+2] = palette[data[i]][2];
            this.buffer.data[j+3] = do {
                if (transparency && data[i] == 0) {
                    0;
                }
                else {
                    255;
                }
            };
        }

        this.ctx.putImageData(this.buffer, 0, 0);
    }


    // componentWillReceiveProps(newProps) {
    //     const { data, palette } = newProps;
    //     // console.log('props');

    //     // diff the new pixels
    //     // for (let i = 0, j = 0; i < data.length; i++, j+=4) {
    //     //     if (
    //     //         this.buffer.data[j] !== palette[data[i]][0] ||
    //     //         this.buffer.data[j+1] !== palette[data[i]][1] ||
    //     //         this.buffer.data[j+2] !== palette[data[i]][2]
    //     //     ) {
    //     //         break;
    //     //     }
    //     //     else if (i === data.length - 1) {
    //     //         return;
    //     //     }
    //     // }
    //     // for (let i = 0; i < newProps.data.length; i++) {
    //     //     if (newProps.palette[newProps.data[i]] !== palette[data[i]]) {
    //     //         break;
    //     //     }
    //     //     else if (i === newProps.data.length - 1) {
    //     //         return;
    //     //     }
    //     // }
    //     this.renderCanvas(newProps);
    // }

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
