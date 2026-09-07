import packageJson from '../../../package.json';
import React, { Component } from 'react';
import { A } from '~/components/documentation/a.js';
import { semver } from '~/util/semver';

const PACKAGE_URL = 'https://raw.githubusercontent.com/kirjavascript/Flex2/master/package.json';
const CHANGELOG_URL = 'https://raw.githubusercontent.com/kirjavascript/Flex2/master/CHANGELOG';

function releasesSince(changelog, currentVersion) {
    const releases = [];
    const sections = changelog.matchAll(/^## \[([^\]]+)]\r?\n([\s\S]*?)(?=^## \[|(?![\s\S]))/gm);

    for (const [, version, changes] of sections) {
        if (semver(version) <= semver(currentVersion)) continue;
        releases.push({
            version,
            changes: changes
                .split('\n')
                .filter((line) => line.trim().startsWith('-'))
                .map((line) => line.trim().replace(/^-\s*/, '')),
        });
    }

    return releases;
}

export class UpdateNotification extends Component {

    state = { version: undefined, releases: [] };

    componentDidMount() {
        Promise.all([
            fetch(PACKAGE_URL).then((response) => response.json()),
            fetch(CHANGELOG_URL).then((response) => response.text()),
        ])
            .then(([{version}, changelog]) => {
                if (semver(version) <= semver(packageJson.version)) return;
                if (localStorage.getItem('dismissedUpdate') === version) return;

                const releases = releasesSince(changelog, packageJson.version);
                this.setState({
                    version,
                    releases: releases.length ? releases : [{version, changes: []}],
                });
            })
            .catch((err) => {
                console.error(err);
            });
    }

    dismiss = () => {
        const { version } = this.state;
        if (version) localStorage.setItem('dismissedUpdate', version);
        this.setState({releases: []});
    };

    render() {
        const { releases } = this.state;
        if (!releases.length) return null;

        return <aside className="update-notification">
            <div className="update-notification__heading">
                <strong>update available</strong>
                <button className="update-notification__dismiss" onClick={this.dismiss}>
                    dismiss
                </button>
            </div>
            <br />
            <div className="update-notification__changes">
                {releases.map(({version, changes}) => <section key={version}>
                    <strong>{version}</strong>
                    <ul>
                        {changes.map((change, index) => <li key={index}>{change}</li>)}
                    </ul>
                </section>)}
            </div>
            <div className="update-notification__footer">
                <A href="https://github.com/kirjavascript/Flex2/releases">
                    download release
                </A>
            </div>
        </aside>;
    }

}
