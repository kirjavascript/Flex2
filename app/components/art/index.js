import React from 'react';
import { environment } from '~/store/environment';
import { mappingState } from '../mappings/state';
import { Tile } from './tile';
import { observer } from 'mobx-react';
import { scrollbarWidth } from 'sass-variables';
import { DimensionsComponent } from '~/util/dimensions-component';
import { Checkbox } from '~/ui';
import { ActiveSelection } from './active-selection';

export const Art = observer(class Art extends DimensionsComponent {

    mousedown = false;
    onMouseDown = () => { this.mousedown = true; };
    onMouseUp = () => { this.mousedown = false; };

    setTile = (index) => {
        environment.config.currentTile = index;
    };

    render() {
        const scale = 4;
        const baseSize = scale * 8;
        const { tiles, art, config } = environment;
        const { width, height, scroll } = this.state;

        const realWidth = width-parseInt(scrollbarWidth);
        const realItemsPerRow = Math.floor(realWidth / baseSize);
        const itemsPerRow = Math.max(1, realItemsPerRow);
        const rowCount = Math.ceil(tiles.length / itemsPerRow);
        const remainder = !realItemsPerRow ? 0 : (realWidth % baseSize) / 2;
        const baseIndex = (0|(scroll / baseSize)) * itemsPerRow;
        const itemQty = (itemsPerRow * (height / baseSize)) + (itemsPerRow * 2);

        // banks are stacked one after another, each starting on its own row.
        // the tiles between two banks aren't art and aren't drawn, and a bank
        // that is switched off isn't either
        const banked = art.length > 1;
        const headerHeight = banked ? 18 : 0;
        let offset = 0;
        const layout = art
            .map((bank, index) => ({ bank, index }))
            .filter(({ bank }) => bank.enabled !== false)
            .map(({ bank, index }) => {
                const headerTop = offset;
                const top = offset + headerHeight;
                const rows = Math.ceil(bank.tiles.length / itemsPerRow) || 0;
                offset = top + rows * baseSize;
                return { bank, index, headerTop, top };
            });

        const totalHeight = (banked ? offset : rowCount * baseSize) || 0;

        return <div
            className="art"
            onMouseDown={this.onMouseDown}
            onMouseUp={this.onMouseUp}
            onMouseLeave={this.onMouseUp}
        >
            {banked && <div className="art-banks">
                {art.map((bank, index) => (
                    <div
                        key={index}
                        className={[
                            'art-bank-chip',
                            index === config.currentBank ? 'active' : '',
                            bank.enabled === false ? 'off' : '',
                        ].filter(Boolean).join(' ')}
                        title={`bank ${index} at tile ${bank.address}`}
                    >
                        <Checkbox
                            checked={bank.enabled !== false}
                            onChange={() => environment.toggleBank(index)}
                        />
                        <span
                            className="art-bank-index"
                            onClick={() => { config.currentBank = index; }}
                        >
                            {index}
                        </span>
                    </div>
                ))}
            </div>}
            <div ref={this.onContainerRef} className="tile-container">
                <div className="tile-list" style={{height: totalHeight}}>
                    {!banked && tiles.length > 0 && <ActiveSelection
                        remainder={remainder}
                        itemsPerRow={itemsPerRow}
                        baseIndex={baseIndex}
                        itemQty={itemQty}
                        totalHeight={totalHeight}
                    />}
                    {banked && layout.map(({ index, headerTop }) => (
                        <div
                            key={`bank-${index}`}
                            className={`art-bank${
                                index === config.currentBank ? ' active' : ''
                            }`}
                            style={{ top: headerTop, left: remainder }}
                            onMouseDown={() => { config.currentBank = index; }}
                        >
                            {index}
                        </div>
                    ))}
                    {layout.map(({ bank, index, top }) => bank.tiles.map((tile, i) => {

                        const x = remainder + (i % itemsPerRow) * baseSize;
                        const y = top + (0|(i / itemsPerRow)) * baseSize;
                        const shouldRender = y > scroll - baseSize * 2
                            && y < scroll + height + baseSize * 2;

                        return shouldRender && (
                            <Tile
                                key={`${index}-${i}`}
                                data={tile}
                                paletteLine={0}
                                scale={scale}
                                onMouseDown={() => {
                                    mappingState.newMapping.active = true;
                                    config.currentBank = index;
                                    this.setTile(bank.address + i);
                                }}
                                onMouseEnter={() => {
                                    this.mousedown &&
                                    this.setTile(bank.address + i);
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
                    }))}
                </div>
            </div>
        </div>;
    }

});
