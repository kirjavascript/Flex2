
import React, { Component } from 'react';
import Masonry from 'react-masonry-component';
import { observer } from 'mobx-react';
import { commands, getCommandLabel } from '~/controls/commands';
import { mappingState } from './state';
import { Item, Checkbox } from '~/ui';

export const Commands = observer(class Commands extends Component {

    render() {
        const { baseWidth } = mappingState;
        const width = Math.max((0 | (baseWidth / 220)) * 220, 220);

        return (
            <Masonry
                className="commands"
                style={{ width }}
            >
                {commands.map((group, i) => (
                    <div key={i} className="group">
                        {group.map(({ name, map, func, color, hidden }) => hidden || (
                            name === 'Import Image' ? (
                                <div key={name}>
                                    <Item
                                        onClick={func}
                                        color={color || 'blue'}
                                        prefix={getCommandLabel(name)}
                                        inverted
                                    >
                                        {map}
                                    </Item>

                                    <div className="command-option" onClick={mappingState.toggleTopLeftAlphaPixel}>
                                        <span>use top left pixel as alpha</span>
                                        <Checkbox
                                            checked={mappingState.topLeftAlphaPixel}
                                            onChange={(e) => { e.stopPropagation(); mappingState.toggleTopLeftAlphaPixel(); }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Item
                                    key={name}
                                    onClick={func}
                                    color={color || 'blue'}
                                    prefix={getCommandLabel(name)}
                                    inverted
                                >
                                    {map}
                                </Item>
                            )
                        ))}
                    </div>
                ))}
            </Masonry>
        );
    }
});
