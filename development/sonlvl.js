// quick, and super dirty

const { readFileSync } = require('fs');
const { join } = require('path');

const base = __dirname + '/../../flex2_test/s1disasm/SonLVL INI Files/';
const levels = ['objGHZ.ini'];
const format = 'Sonic 1.js';
const defaultCmp = 'Nemesis';
const pathMod = (str) => str.slice(3);
const palettes = []; // TODO - use SonLVL.ini

const objects = [];

levels.forEach(filename => {
    const folder = {
        name: filename,
        children: [],
        isDirectory: true,
        expanded: false,
    };

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
            const flexObj = {
                name: obj.name,
                palettes,
                format,
                art: {
                    path: pathMod(obj.art),
                    compression: defaultCmp,
                    offset: 0,
                },
                mappings: {
                    path: pathMod(obj.mapasm),
                    label: '',
                },
                dplcs: {
                    enabled: false,
                    path: '',
                    label: '',
                },
            };

            if (obj.dplcasm) {
                flexObj.dplcs.enabed = true;
                flexObj.dplcs.path = pathMod(obj.dplcasm);
            }

            if (obj.artcmp) {
                flexObj.art.compression = obj.artcmp;
            }

            folder.children.push(flexObj);
        }
    })

    objects.push(folder);
});


// [Sonic]
// art=../artunc/Sonic.bin
// artcmp=Uncompressed
// mapasm=../_maps/Sonic.asm
// dplcasm=../_maps/Sonic - Dynamic Gfx Script.asm
// frame=1
// [0D]
// name=Signpost
// art=../artnem/Signpost.bin
// mapasm=../_maps/Signpost.asm
