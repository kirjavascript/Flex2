// quick, and super dirty

const { readFileSync } = require('fs');
const { join } = require('path');

const base = __dirname + '/../../flex2_test/s2disasm/SonLVL INI Files/';
const format = 'Sonic 2.js';
const projectName = 'Sonic 2';
const defaultCmp = 'Nemesis';
const folders = [
    'obj.ini',
    'objARZ.ini',
    'objMCZ.ini',
    'objCNZ.ini',
    'objMTZ.ini',
    'objCPZ.ini',
    'objOOZ.ini',
    'objDEZ.ini',
    'objSCZ.ini',
    'objEHZ.ini',
    'objWFZ.ini',
];
const basePalette = [
    { path: 'art/palettes/SonicAndTails.bin', length: 1 }
];
const pathMod = (str) => str.slice(3).replace(/&amp;/g, '&').replace(/\|.+/, '');

function parseINI(ini) {
    ini = ini.match(/\[.+\][^[]+/gm);
    return ini.map(sect => {
        const obj = {};
        sect.split('\n')
            .forEach(line => {
                if (line.includes('=')) {
                    const [name, prop] = line.split('=');
                    obj[name] = prop;
                }
            })
        return obj;
    });
}

const paletteLookup = {};

const sonlvl = readFileSync(join(base, 'SonLVL.ini'), 'utf8')

parseINI(sonlvl).forEach(obj => {
    if (obj.objlst && obj.palette) {
        paletteLookup[obj.objlst] = pathMod(
            obj.palette.split('|').pop().replace(/:.+/, '')
        );
    }
})

const objects = [];

folders.forEach(filename => {
    const palettes = paletteLookup[filename]
        ? [...basePalette, { path: paletteLookup[filename], length: 3 }]
        : basePalette;
    const folder = {
        name: filename.replace(/obj|\.ini/g, ''),
        children: [],
        isDirectory: true,
        expanded: false,
    };

    const ini = readFileSync(join(base, filename), 'utf8');
    parseINI(ini).forEach(obj => {
        if (obj.mapasm) {
            obj.map = obj.mapasm
        }
        if (obj.dplcasm) {
            obj.dplc = obj.dplcasm;
        }
        if (obj.art && obj.map) {
            const flexObj = {
                name: obj.name || '???',
                palettes,
                format,
                art: {
                    path: pathMod(obj.art),
                    compression: defaultCmp,
                    offset: 0,
                },
                mappings: {
                    path: pathMod(obj.map),
                    label: '',
                },
                dplcs: {
                    enabled: false,
                    path: '',
                    label: '',
                },
            };

            if (obj.dplc) {
                flexObj.dplcs.enabled = true;
                flexObj.dplcs.path = pathMod(obj.dplc);
            }

            if (obj.artcmp) {
                flexObj.art.compression = obj.artcmp;
            }

            folder.children.push(flexObj);
        } else if (obj.codefile)  {
            const cs = readFileSync(join(base, obj.codefile), 'utf8');
            const flexObj = {
                name: '???',
                format,
                palettes,
                art: { path: '', compression: defaultCmp, offset: 0, },
                mappings: { path: '', label: '', },
                dplcs: { enabled: false, path: '', label: '', },
            };
            const name = cs.match(/Name\s+{\s+get { return "(.+?)"/)
            if (name) {
                flexObj.name = name[1];
            }
            const art = cs.match(/OpenArtFile\("(.+?)"/);
            if (art) {
                flexObj.art.path = pathMod(art[1]);
            }
            const map = cs.match(/artfile,(.+)?"(.+?)",/);
            if (map) {
                flexObj.mappings.path = pathMod(map[2]);
            }
            folder.children.push(flexObj);

        } else if (obj.xmlfile) {
            const xml = readFileSync(join(base, obj.xmlfile), 'utf8');
            const flexObj = {
                name: '???',
                format,
                palettes,
                art: { path: '', compression: defaultCmp, offset: 0, },
                mappings: { path: '', label: '', },
                dplcs: { enabled: false, path: '', label: '', },
            };
            const name = xml.match(/Name="(.+?)"/);
            if (name) {
                flexObj.name = name[1];
            }
            const art = xml.match(/<ArtFile filename="(.+?)"/);
            if (art && art[1] !== 'LevelArt') {
                flexObj.art.path = pathMod(art[1]);
            }
            const map = xml.match(/<MapFile type="(.+?)" filename="(.+?)"/);
            if (map) {
                flexObj.mappings.path = pathMod(map[2]);
            }

            folder.children.push(flexObj);
        }
    })

    objects.push(folder);
});

const config = {
    Flex: 2,
    name: projectName,
    objects,
}

console.log(JSON.stringify(config, 0, 4));
