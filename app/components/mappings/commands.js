
import React, { Component } from 'react';
import Masonry from 'react-masonry-component';
import { observer } from 'mobx-react';
import { commands, getCommandLabel } from '#controls/commands';
import { mappingState } from './state';
import { Item } from '#ui';

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
                            <Item
                                onClick={func}
                                key={name}
                                color={color || 'blue'}
                                prefix={getCommandLabel(name)}
                                inverted
                            >
                                {map}
                            </Item>
                        ))}
                    </div>
                ))}
            </Masonry>
        );
    }
});
