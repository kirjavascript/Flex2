import React, { Component } from 'react';
import { environment } from '#store/environment';
import { observer } from 'mobx-react';
import { observable } from 'mobx';

@observer
export class Palettes extends Component {

    state = { vert: false };

    componentWillMount() {
        this.props.node.setEventListener('resize', (e) => {
            const { width, height } = e.rect;

            requestAnimationFrame(() => {
                this.setState({vert: width < height});
            });
        });
    }

    render() {
        const { vert } = this.state;
        const { palettes } = environment;
        return (
            <div className={`palettes ${vert&&'vert'}`}>
                {palettes.map((line, lineIndex) => {
                    return <div key={lineIndex} className="line">
                        <div className="index">
                            {lineIndex}
                        </div>
                        {line.map((color, colorIndex) => {
                            return <div
                                key={colorIndex}
                                className="color"
                                style={{
                                    backgroundColor: color,
                                    textAlign: 'center',
                                }}
                            >
                            </div>;
                        })}
                    </div>;
                })}
            </div>
        );
    }

}
