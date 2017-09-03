import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';

@observer
export class Palettes extends Component {

    render() {
        return <div>
            {environment.palettesWeb.map((line, i) => {
                return <div key={i}>
                    {line.map((color, i) => {
                        return <div
                            key={i}
                            style={{
                                display: 'inline-block',
                                backgroundColor: color,
                                width: 20,
                                height: 20,
                            }}
                        />;
                    })}
                </div>;
            })}
        </div>;
    }

}
