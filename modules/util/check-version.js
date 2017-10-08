import packageJson from '../../package.json';

function semvarToInt(str) {
    // currently just a rough calculation
    return +str.split`.`.map((d) => d.padStart(3, '0')).join``;
}

false &&
fetch('https://raw.githubusercontent.com/kirjavascript/Flex2/master/package.json')
    .then((response) => response.json())
    .then(({version}) => {
        const currentVersion = semvarToInt(packageJson.version);
        const githubVersion = semvarToInt(version);

        if (githubVersion > currentVersion) {
            document.title = `Flex 2 - new version (${version}) available`;
        }
    })
    .catch((err) => {
        console.error(err);
    });
