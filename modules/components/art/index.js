import React, { Component } from 'react';
import { environment } from '#store/environment';
import { Tile } from './tile';
import { Select } from '#ui';
import { AutoSizer, List } from 'react-virtualized';
import { autorun } from 'mobx';

export class Art extends Component {

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

    render() {
        const scale = 4;
        const baseSize = scale * 8;
        const { tiles } = environment;

        return <div className="art">

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
                                                if (tiles.length <= startIndex + i) return;

                                                return <Tile
                                                    key={startIndex + i}
                                                    data={tiles[startIndex + i]}
                                                    paletteLine={0}
                                                    scale={scale}
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
