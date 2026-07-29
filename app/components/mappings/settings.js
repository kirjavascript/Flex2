import React from 'react';
import { observer } from 'mobx-react';
import { environment } from '~/store/environment';
import { Modal, Item, Button, Checkbox } from '~/ui';
import { mappingState } from './state';

export const Settings = observer(() => {
    const { active } = mappingState.settings;

    return (
        <Modal
            className="mapping-settings"
            spring={{
                top: active ? 60 : -100,
                opacity: active ? 1 : 0,
            }}
        >
            <Item bold>Settings</Item>

            <div className="settings">
                <div className="setting-row">
                    <span>Render starting with palette line</span>
                    <input
                        type="text"
                        value={environment.config.artPaletteLine}
                        readOnly
                        onKeyDown={(e) => {
                            if (e.repeat) return;
                            const v = parseInt(e.key);
                            if (v >= 0 && v <= 3) environment.config.artPaletteLine = v;
                            e.preventDefault();
                        }}
                        onWheel={(e) => {
                            const cur = environment.config.artPaletteLine;
                            const next = cur + (e.deltaY > 0 ? -1 : 1);
                            if (next >= 0 && next <= 3) environment.config.artPaletteLine = next;
                        }}
                    />
                </div>

                <div className="setting-row">
                    <span>Import Image: use top left pixel as alpha</span>
                    <Checkbox
                        checked={mappingState.topLeftAlphaPixel}
                        onChange={() => mappingState.toggleTopLeftAlphaPixel()}
                    />
                </div>

                <div className="setting-row">
                    <span>Autodismiss new mappings window when placing a mapping</span>
                    <Checkbox
                        checked={mappingState.autodismiss}
                        onChange={mappingState.toggleAutodismiss}
                    />
                </div>
            </div>

            <div className="actions">
                <Button color="magenta" onClick={mappingState.toggleSettings}>
                    close
                </Button>
            </div>
        </Modal>
    );
});
