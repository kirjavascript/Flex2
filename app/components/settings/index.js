import React, { useState, useRef, useEffect } from 'react';
import { webFrame } from 'electron';
import { observer } from 'mobx-react';
import { environment } from '~/store/environment';
import { Checkbox } from '~/ui';
import { mappingState } from '~/components/mappings/state';
import { Keys } from './keys';

const ScaleSlider = observer(() => {
    const [draft, setDraft] = useState(null);
    const [dragging, setDragging] = useState(false);
    const display = draft ?? mappingState.globalScale ?? 1;

    return (
        <div className="setting-row">
            <span>UI scale ({Number(display).toFixed(2)}x)</span>
            <div className="slider">
                <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={Math.round(display * 100)}
                    onMouseDown={() => setDragging(true)}
                    onMouseUp={(e) => {
                        const val = parseInt(e.target.value) / 100;
                        mappingState.globalScale = val;
                        webFrame.setZoomFactor(val);
                        setDraft(null);
                        setDragging(false);
                    }}
                    onChange={(e) => {
                        const val = parseInt(e.target.value) / 100;
                        if (dragging) {
                            setDraft(val);
                        } else {
                            mappingState.globalScale = val;
                            webFrame.setZoomFactor(val);
                        }
                    }}
                />
            </div>
        </div>
    );
});

// React's wheel listener is passive, so it can't stop the tab scrolling
const PaletteLineInput = observer(() => {
    const ref = useRef();
    useEffect(() => {
        const onWheel = (e) => {
            e.preventDefault();
            const next = environment.config.artPaletteLine + (e.deltaY > 0 ? -1 : 1);
            if (next >= 0 && next <= 3) environment.config.artPaletteLine = next;
        };
        const node = ref.current;
        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
    }, []);

    return (
        <input
            ref={ref}
            type="text"
            className="render-line"
            value={environment.config.artPaletteLine ?? 0}
            readOnly
            onKeyDown={(e) => {
                if (e.repeat) return;
                const v = parseInt(e.key);
                if (v >= 0 && v <= 3) environment.config.artPaletteLine = v;
                e.preventDefault();
            }}
        />
    );
});

export const Settings = observer(() => {
    return (
        <div className="mapping-settings">
            <div className="settings">
                <div className="setting-row">
                    <span>Render starting with palette line</span>
                    <PaletteLineInput />
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

                <div className="setting-row">
                    <span>Autofill metadata, palette and priority on new mappings and DPLCs</span>
                    <Checkbox
                        checked={mappingState.autofillMetadata}
                        onChange={mappingState.toggleAutofillMetadata}
                    />
                </div>

                <div className="setting-row">
                    <span>Uncapped DPLC entries (chunked on save; off caps at 16 tiles)</span>
                    <Checkbox
                        checked={mappingState.uncappedDPLCs}
                        onChange={mappingState.toggleUncappedDPLCs}
                    />
                </div>
                <ScaleSlider />
            </div>
            <Keys />
        </div>
    );
});
