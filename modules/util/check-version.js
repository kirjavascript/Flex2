import packageJson from '../../package.json';

fetch('https://raw.githubusercontent.com/kirjavascript/Flex2/master/package.json')
    .then((response) => response.json())
    .then(({version}) => {
        console.log(version);
        console.log(packageJson);
        // title ?
    })
    .catch((err) => {
        console.error(err);
    });
