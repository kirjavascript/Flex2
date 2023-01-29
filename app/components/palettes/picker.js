import React, { useState } from 'react';
import { black, grey, white2, white } from 'sass-variables';
import reactCSS from 'reactcss';

import {
    ColorWrap,
    Saturation,
    Hue,
    Checkboard,
    EditableInput,
} from 'react-color/lib/components/common';
import { isValidHex } from 'react-color/lib/helpers/color';

export const SketchFields = ({ onChange, rgb, hsl, hex, disableAlpha }) => {
    const styles = reactCSS(
        {
            default: {
                fields: {
                    display: 'flex',
                    paddingTop: '4px',
                },
                single: {
                    flex: '1',
                    paddingLeft: '6px',
                },
                alpha: {
                    flex: '1',
                    paddingLeft: '6px',
                },
                double: {
                    flex: '1.2',
                },
                input: {
                    width: '100%',
                    borderRadius: '2px',
                    fontSize: '14px',
                    padding: '0px',
                    textAlign: 'center',
                    border: `1px solid ${grey}`,
                },
                label: {
                    display: 'block',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: white,
                    paddingTop: '3px',
                    paddingBottom: '4px',
                    textTransform: 'capitalize',
                },
            },
            disableAlpha: {
                alpha: {
                    display: 'none',
                },
            },
        },
        { disableAlpha },
    );

    const handleChange = (data, e) => {
        if (data.hex) {
            isValidHex(data.hex) &&
                onChange(
                    {
                        hex: data.hex,
                        source: 'hex',
                    },
                    e,
                );
        } else if (data.r || data.g || data.b) {
            onChange(
                {
                    r: data.r || rgb.r,
                    g: data.g || rgb.g,
                    b: data.b || rgb.b,
                    a: rgb.a,
                    source: 'rgb',
                },
                e,
            );
        } else if (data.a) {
            if (data.a < 0) {
                data.a = 0;
            } else if (data.a > 100) {
                data.a = 100;
            }

            data.a /= 100;
            onChange(
                {
                    h: hsl.h,
                    s: hsl.s,
                    l: hsl.l,
                    a: data.a,
                    source: 'rgb',
                },
                e,
            );
        }
    };

    return (
        <div style={styles.fields} className="flexbox-fix">
            <div style={styles.double}>
                <EditableInput
                    style={{ input: styles.input, label: styles.label }}
                    label="hex"
                    value={hex.replace('#', '')}
                    onChange={handleChange}
                />
            </div>
            <div style={styles.single}>
                <EditableInput
                    style={{ input: styles.input, label: styles.label }}
                    label="r"
                    value={rgb.r}
                    onChange={handleChange}
                    dragLabel="true"
                    dragMax="255"
                />
            </div>
            <div style={styles.single}>
                <EditableInput
                    style={{ input: styles.input, label: styles.label }}
                    label="g"
                    value={rgb.g}
                    onChange={handleChange}
                    dragLabel="true"
                    dragMax="255"
                />
            </div>
            <div style={styles.single}>
                <EditableInput
                    style={{ input: styles.input, label: styles.label }}
                    label="b"
                    value={rgb.b}
                    onChange={handleChange}
                    dragLabel="true"
                    dragMax="255"
                />
            </div>
        </div>
    );
};

export const Sketch = ({
    width,
    rgb,
    hex,
    hsv,
    hsl,
    onChange,
    onSwatchHover,
    disableAlpha,
    renderers,
    styles: passedStyles = {},
    className = '',
}) => {
    const styles = reactCSS({
        default: {
            picker: {
                width,
                padding: '10px 10px 0',
                boxSizing: 'initial',
                boxShadow:
                    '0 0 0 1px rgba(0,0,0,.15), 0 8px 16px rgba(0,0,0,.15)',
                background: black,
                border: `1px solid ${white2}`,
            },
            saturation: {
                width: '100%',
                paddingBottom: '75%',
                position: 'relative',
                overflow: 'hidden',
            },
            Saturation: {
                radius: '3px',
                shadow:
                    'inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 4px rgba(0,0,0,.25)',
                border: `1px solid ${white2}`,
            },
            controls: {
                display: 'flex',
            },
            sliders: {
                padding: '4px 0',
                flex: '1',
            },
            color: {
                width: '24px',
                height: '24px',
                position: 'relative',
                marginTop: '4px',
                marginLeft: '4px',
                borderRadius: '3px',
            },
            activeColor: {
                absolute: '0px 0px 0px 0px',
                borderRadius: '2px',
                background: `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`,
                boxShadow:
                    'inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 4px rgba(0,0,0,.25)',
            },
            hue: {
                position: 'relative',
                height: '24px',
                overflow: 'hidden',
            },
            Hue: {
                radius: '2px',
                shadow:
                    'inset 0 0 0 1px rgba(0,0,0,.15), inset 0 0 4px rgba(0,0,0,.25)',
            },
            circle: {
                width: '4px',
                height: '4px',
                boxShadow: `0 0 0 1.5px ${(rgb.r+rgb.b+rgb.g) < 384 ? white : black}, inset 0 0 1px 1px rgba(0,0,0,.3),
            0 0 1px 2px rgba(0,0,0,.4)`,
                borderRadius: '50%',
                cursor: 'hand',
                transform: 'translate(-2px, -2px)',
            },
        },
    });

    return (
        <div style={styles.picker} className={`sketch-picker ${className}`}>
            <div style={styles.saturation}>
                <Saturation
                    style={styles.Saturation}
                    hsl={hsl}
                    hsv={hsv}
                    onChange={onChange}
                    pointer={() => (
                        <div style={styles.circle} />
                    )}
                />
            </div>
            <div style={styles.controls} className="flexbox-fix">
                <div style={styles.sliders}>
                    <div style={styles.hue}>
                        <Hue
                            style={styles.Hue}
                            hsl={hsl}
                            onChange={onChange}
                            height="24px"
                            pointer={() => (
                                <div style={{
                                    width: 4,
                                    height: 22,
                                    backgroundColor: white,
                                    borderRadius: '4px',
                                    pointerEvents: 'none',
                                    transform: 'translate(-2px, 1px)',
                                }}/>
                            )}
                        />
                    </div>
                </div>
                <div style={styles.color}>
                    <Checkboard />
                    <div style={styles.activeColor} />
                </div>
            </div>

            <SketchFields
                rgb={rgb}
                hsl={hsl}
                hex={hex}
                onChange={onChange}
                disableAlpha={disableAlpha}
            />
        </div>
    );
};

Sketch.defaultProps = {
    disableAlpha: true,
    width: 200,
    styles: {},
};

const SketchPicker = ColorWrap(Sketch);

export default ({ color, onChange }) => {
    const [tmp, setTmp] = useState(false);
    return (
        <SketchPicker
            color={tmp ? tmp : color}
            onChange={({ hex }) => setTmp(hex)}
            onChangeComplete={(e) => {
                onChange(e);
                setTmp(undefined);
            }}
        />
    );
};
