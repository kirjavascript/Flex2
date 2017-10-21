import React, { Component } from 'react';
import { environment } from '#store/environment';
import { mappingState } from '../mappings/state';
import { Tile } from './tile';
import { Select } from '#ui';
import { AutoSizer, List } from 'react-virtualized';
import { autorun } from 'mobx';

export class Art extends Component {

    // height: 100%;
    // display: flex;
    // flex-direction: column;
    // .autoWrapper {
    //     flex-grow: 1;
    //     width: 100%;
    //     .ReactVirtualized__List:focus {
    //         outline: none;
    //     }
    //     .listRow {
    //         display: flex;
    //     }
    // }

    onListRef = (node) => {
        if (node) {
            this.disposer = autorun(() => {
                environment.tiles.forEach((tile) => {});
                this.forceUpdate();
                // node.forceUpdateGrid();
            });
        }
        else {
            this.disposer();
        }
    };

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

        return <div
            className="art"
            onMouseDown={this.onMouseDown}
            onMouseUp={this.onMouseUp}
            onMouseLeave={this.onMouseUp}
        >

            <div className="autoWrapper">
                <AutoSizer>
                    {({ height, width }) => {
                        const itemsPerRow = Math.floor(width / baseSize);
                        const rowCount = Math.ceil(tiles.length / itemsPerRow);

                        return <List
                            ref={this.onListRef}
                            width={width}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={baseSize}
                            overscanRowCount={0}
                            rowRenderer={({ index, key, style }) => {

                                const startIndex = index * itemsPerRow;

                                const { tiles } = environment;
                                return (
                                      <div
                                          key={index}
                                          style={style}
                                          className="listRow"
                                      >
                                          {Array.from({length: itemsPerRow}, (_, i) => {
                                              const realIndex = startIndex + i;
                                              if (tiles.length <= realIndex) return;

                                              return <Tile
                                                    key={realIndex}
                                                    data={tiles[realIndex]}
                                                    paletteLine={0}
                                                    scale={scale}
                                                    onMouseDown={() => {
                                                        mappingState.newMapping.active = true;
                                                        this.setTile(realIndex);
                                                    }}
                                                    onMouseEnter={() => {
                                                        this.mousedown &&
                                                        this.setTile(realIndex);
                                                    }}
                                                />;
                                          })}
                                      </div>
                                );
                            }}
                        />;
                    }}
                </AutoSizer>
            </div>

        </div>;
    }

}
