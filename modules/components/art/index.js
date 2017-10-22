import React, { Component } from 'react';
import { environment } from '#store/environment';
import { mappingState } from '../mappings/state';
import { Tile } from './tile';
import { observer } from 'mobx-react';
import { scrollbarWidth } from '!!sass-variables-loader!#styles/variables.scss';
import { DimensionsComponent } from '#util/dimensions-component';
import { ActiveSelection } from './active-selection';

@observer
export class Art extends DimensionsComponent {

    mousedown = false;
    onMouseDown = () => { this.mousedown = true; };
    onMouseUp = () => { this.mousedown = false; };

    setTile = (index) => {
        environment.config.currentTile = index;
    };

    render() {
        const scale = 4;
        const baseSize = scale * 8;
        const { tiles } = environment;
        const { width, height, scroll } = this.state;

        const realItemsPerRow = Math.floor(width / baseSize);
        const itemsPerRow = Math.max(1, realItemsPerRow);
        const rowCount = Math.ceil(tiles.length / itemsPerRow);
        const remainder = !realItemsPerRow ? 0 : -(parseInt(scrollbarWidth)/2) + (width % baseSize) / 2;
        const baseIndex = (0|(scroll / baseSize)) * itemsPerRow;
        const itemQty = (itemsPerRow * (height / baseSize)) + (itemsPerRow * 2);
        const totalHeight = rowCount * baseSize || 0;

        return <div
            className="art"
            onMouseDown={this.onMouseDown}
            onMouseUp={this.onMouseUp}
            onMouseLeave={this.onMouseUp}
        >
            <div ref={this.onContainerRef} className="tile-container">
                <div className="tile-list" style={{height: totalHeight}}>
                    <ActiveSelection
                        remainder={remainder}
                        itemsPerRow={itemsPerRow}
                        baseIndex={baseIndex}
                        itemQty={itemQty}
                    />
                    {tiles.map((tile, index) => {

                        const x = remainder + (index % itemsPerRow) * baseSize;
                        const y = (0|(index / itemsPerRow)) * baseSize;
                        const shouldRender = index >= baseIndex && index < baseIndex + itemQty;

                        return shouldRender && (
                            <Tile
                                key={index}
                                data={tile}
                                paletteLine={0}
                                scale={scale}
                                onMouseDown={() => {
                                    mappingState.newMapping.active = true;
                                    this.setTile(index);
                                }}
                                onMouseEnter={() => {
                                    this.mousedown &&
                                    this.setTile(index);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: y,
                                    left: x,
                                    width: baseSize,
                                    height: baseSize,
                                }}
                            />
                        );
                    })}
                </div>
            </div>

        </div>;
    }

}
