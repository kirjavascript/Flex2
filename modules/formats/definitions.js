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
    // mappings
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

        const spriteDefMatch = definition.match(/spriteDefinition\((.*?)\)/);
        if (spriteDefMatch) {
            const spriteDef = spriteDefMatch[1];
            const spriteLayout = spriteDef
                .match(/(.)\1*/g)
                .map((str) => ({
                    name: tokens[str[0]] || 'unknown',
                    length: str.length,
                }));

            def.mappingSize = spriteDef.length / 8;
            def.mappingDef = spriteLayout;
        }

        return def;
    }
    catch(e) {
        errorMsg('Error Parsing Definition', e.message);
    }
}
