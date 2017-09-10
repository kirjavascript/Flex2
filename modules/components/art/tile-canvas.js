import React, { Component } from 'react';
import { environment } from '#store/environment';
import { autorun, toJS } from 'mobx';

export class Tile extends Component {

    // used in sortable sprite list;
    //
    // onSortRef = (node) => {
    //     if (node) {
    //         this.sortable = node;
    //     }
    // };

    // onSortStart = ({node, index}) => {
    //     const { helper } = this.sortable;
    //     // clone canvas tiles correctly
    //     const srcTiles = node.querySelectorAll('canvas');
    //     const dstTiles = helper.querySelectorAll('canvas');
    //     for (let i = 0; i < dstTiles.length; i++) {
    //         dstTiles[i].getContext('2d').drawImage(srcTiles[i], 0, 0);
    //     }
    // };

    canvasRef = (node) => {
        if (node) {
            this.node = node;
            this.ctx = node.getContext('2d');
            this.ctx.imageSmoothingEnabled = false;
            this.buffer = this.ctx.getImageData(0, 0, 8, 8);

            // this.checkVisible();

            // rerender if transparency changes (no diffing)
            this.disposer = autorun(() => {
                environment.config.transparency;
                this.props.data;
                this.renderCanvas(); // also happens on init
            });
        }
        else {
            this.disposer();
        }
    };

    checkVisible = () => {
        // Sonic 2 Object Manager Style
        const y = this.node.getBoundingClientRect().top;
        return !(y < 0 || y > window.innerHeight);
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


    componentWillReceiveProps(newProps) {
        const { data, palette } = newProps;

        // diff the new pixels
        for (let i = 0, j = 0; i < data.length; i++, j+=4) {
            if (
                // palette[data[i]] !== this.props.palette[this.props.data[i]] || // object relations
                this.buffer.data[j] !== palette[data[i]][0] ||
                this.buffer.data[j+1] !== palette[data[i]][1] ||
                this.buffer.data[j+2] !== palette[data[i]][2]
            ) {
                return this.renderCanvas(newProps);
            }
            else if (i === data.length - 1) {
                return;
            }
        }
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
