import { errorMsg } from '#util/dialog';

export const mapDefS2 = `
    ; Sonic 2 Mapping Definition

    headerSize(2)           ; bytes
    spriteDefinition(
        TTTT TTTT           ; relative top edge position of sprite
        ????                ; always zero (ignore)
        WW                  ; width of mapping (tiles -1)
        HH                  ; height of mapping (tiles -1)
        P                   ; priority flag
        CC                  ; palette line
        Y                   ; v flip
        X                   ; h flip
        AAA AAAA AAAA       ; art tile
        2222222222222222    ; two player data
        LLLL LLLL LLLL LLLL ; relative left edge position of sprite
    )
`;

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
};

// genericize this to support dplcs too

export function parseMapDef(definition) {
    // stripe comments and whitespace
    definition = definition.replace(/(\s|;(.*?)$)/gm, '');
    try {
        const headerSizeMatch = definition.match(/headerSize\((\d+)\)/);
        if (!headerSizeMatch) {
            throw new Error('Cannot find header size');
        }
        const spriteDefMatch = definition.match(/spriteDefinition\((.*?)\)/);
        if (!spriteDefMatch) {
            throw new Error('Cannot find sprite definition');
        }
        const spriteDef = spriteDefMatch[1];

        const spriteLayout = spriteDef
            .match(/(.)\1*/g)
            .map((str) => ({
                name: tokens[str[0]],
                length: str.length,
            }));

        return {
            headerSize: parseInt(headerSizeMatch[1]),
            mappingSize: spriteDef.length / 8,
            mappingDef: spriteLayout,
        };
    }
    catch(e) {
        errorMsg('Error Parsing Mapping Definition', e.message);
    }
}
