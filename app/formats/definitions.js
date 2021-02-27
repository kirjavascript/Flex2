// @deprecated
import { errorMsg } from '#util/dialog';

export const mappingFormats = {
    'Sonic 1': `; Sonic 1 Mapping Definition

headerSize(1)           ; bytes
mappingDefinition(
    TTTT TTTT           ; relative signed top edge position of sprite
    ????                ; always zero (ignore)
    WW                  ; width of mapping (tiles -1)
    HH                  ; height of mapping (tiles -1)
    P                   ; priority flag
    CC                  ; palette line
    Y                   ; v flip
    X                   ; h flip
    AAA AAAA AAAA       ; art tile offset
    LLLL LLLL           ; relative signed left edge position of sprite
)`,
    'Sonic 2': `; Sonic 2 Mapping Definition

headerSize(2)           ; bytes
mappingDefinition(
    TTTT TTTT           ; relative signed top edge position of sprite
    ????                ; always zero (ignore)
    WW                  ; width of mapping (tiles -1)
    HH                  ; height of mapping (tiles -1)
    P                   ; priority flag
    CC                  ; palette line
    Y                   ; v flip
    X                   ; h flip
    AAA AAAA AAAA       ; art tile offset
    2222 2222 2222 2222 ; two player data
    LLLL LLLL LLLL LLLL ; relative signed left edge position of sprite
)`,

    'Sonic 3&K': `; Sonic 3&K Mapping Definition

headerSize(2)           ; bytes
mappingDefinition(
    TTTT TTTT           ; relative signed top edge position of sprite
    ????                ; always zero (ignore)
    WW                  ; width of mapping (tiles -1)
    HH                  ; height of mapping (tiles -1)
    P                   ; priority flag
    CC                  ; palette line
    Y                   ; v flip
    X                   ; h flip
    AAA AAAA AAAA       ; art tile offset
    LLLL LLLL LLLL LLLL ; relative signed left edge position of sprite
)`,
};

export const dplcFormats = {
    'Sonic 1': `; Sonic 1 DPLC Definition

headerSize(1)           ; bytes
dplcDefinition(
    NNNN                ; number of tiles (-1)
    AAAA AAAA AAAA      ; art tile offset
)`,
    'Sonic 2/3&K': `; Sonic 2/3&K DPLC Definition

headerSize(2)           ; bytes
dplcDefinition(
    NNNN                ; number of tiles (-1)
    AAAA AAAA AAAA      ; art tile offset
)`,
};

const tokens = {
    '?': 'ignore',
    'T': 'top',
    'W': 'width',
    'H': 'height',
    'P': 'priority',
    'C': 'palette',
    'Y': 'vflip',
    'X': 'hflip',
    'A': 'art',
    '2': 'two',
    'L': 'left',
    'N': 'size',
};

export function parseDef(definition) {
    // stripe comments and whitespace
    definition = definition.replace(/(\s|;(.*?)$)/gm, '');

    try {
        let def = {};

        const headerSizeMatch = definition.match(/headerSize\((\d+)\)/);
        if (!headerSizeMatch) {
            throw new Error('Cannot find header size');
        }
        else {
            def.headerSize = parseInt(headerSizeMatch[1]);
        }

        const mappingDefMatch = definition.match(/mappingDefinition\((.*?)\)/);
        if (mappingDefMatch) {
            const mappingDef = mappingDefMatch[1];
            const { size, layout } = parseTokens(mappingDef);
            def.mappingSize = size;
            def.mappingDef = layout;
        }

        const dplcDefMatch = definition.match(/dplcDefinition\((.*?)\)/);
        if (dplcDefMatch) {
            const dplcDef = dplcDefMatch[1];
            const { size, layout } = parseTokens(dplcDef);
            def.dplcSize = size;
            def.dplcDef = layout;
        }

        return def;
    }
    catch(e) {
        errorMsg('Error Parsing Definition', e.message);
    }
}

function parseTokens(definition) {
    const spriteLayout = definition
        .match(/(.)\1*/g)
        .map((str) => ({
            name: tokens[str[0]] || 'unknown',
            length: str.length,
        }));

    return {
        size: definition.length / 8,
        layout: spriteLayout,
    };
}
