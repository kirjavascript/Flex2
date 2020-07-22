import packageJson from '../../../package.json';
import React, { Component } from 'react';
import { A } from './a.js';
import { semver } from '#util/semver';

export class Version extends Component {

    state = { newVersion: void 0, error: false };

    componentDidMount() {
        fetch('https://raw.githubusercontent.com/kirjavascript/Flex2/master/package.json')
            .then((response) => response.json())
            .then(({version}) => {
                const currentVersion = semver(packageJson.version);
                const githubVersion = semver(version);
                if (githubVersion > currentVersion) {
                    this.setState({newVersion: version});
                }
            })
            .catch((err) => {
                console.error(err);
            });
    }

    render() {
        const { error, newVersion } = this.state;

        return <div>
            version {packageJson.version}
            {newVersion && (
                <span>
                    {' - '}
                    <A href="https://github.com/kirjavascript/Flex2/releases" className="magenta">
                        a new version ({newVersion}) is available
                    </A>
                </span>
            )}
            {' ★ '}
            <A href="https://www.github.com/kirjavascript/Flex2">
                Source code / Report bugs
            </A>
            {error && <div className="red">{error}</div>}
        </div>;
    }

}
