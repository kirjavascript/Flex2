const { readFileSync } = require('fs');
const { join } = require('path');

const base = __dirname + '/../../flex2_test/s1disasm/SonLVL INI Files/';

const levels = ['objGHZ.ini'];

const objects = [];

levels.forEach(filename => {
    const folder = [];

    ini = readFileSync(join(base, filename), 'utf8');
    ini = ini.match(/\[.+\][^[]+/gm);
    ini.forEach(sect => {
        const obj = {};
        sect.split('\n')
            .forEach(line => {
                if (line.includes('=')) {
                    const [name, prop] = line.split('=');
                    obj[name] = prop;
                }
            })
        if (obj.name && obj.art && obj.mapasm) {
            console.log(obj);
        }
    })
});
