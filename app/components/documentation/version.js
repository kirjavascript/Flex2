import packageJson from '../../../package.json';
import React from 'react';
import { A } from './a.js';
const { previewVersion } = packageJson;

export function Version() {
    return <div>
            {previewVersion ? (
                `pre-release version ${previewVersion}  ★ `
            ) : (
                `version ${packageJson.version}  ★ `
            )}
            <A href="https://www.github.com/kirjavascript/Flex2">
                Source code / Report bugs
            </A>
        </div>;
}
