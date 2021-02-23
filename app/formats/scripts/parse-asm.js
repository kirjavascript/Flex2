import {
    regex,
    sequenceOf,
    str,
    char,
    digits,
    choice,
    whitespace,
    many,
    anyOfString,
    sepBy,
} from 'arcsecond';

const ignore = Symbol('ignore');
const lbl = Symbol('lbl');
const addr = Symbol('addr');
const data = Symbol('data');
const sizes = {
    b: 1,
    w: 2,
    l: 4,
};

export function parseASM(text) {
    const comment = regex(/^;.*$/m).map(() => [ignore]);
    const even = str('even').map(() => [ignore]);
    const label = regex(/^[A-Z0-9_]+(\s+)?:/i).map(t => [lbl, t.replace(':', '')]);
    const hex = regex(/^\$[A-F0-9]+/i).map(t => [data, parseInt(t.slice(1), 16)]);
    const address = regex(/^[A-Z0-9_]+-[A-Z0-9_]+/i).map(t => [addr, t]);

    const value = choice([
        digits.map(t => [data, t]),
        hex,
        address,
    ]);

    const dc = sequenceOf([
        str('dc.'),
        anyOfString('bwl'),
        whitespace,
        sepBy(regex(/^(\s+)?,(\s+)?/)) (value),
    ]).map(([, size, _, values]) => [data, sizes[size], values]);

    const parser = many(choice([
        whitespace.map(() => [ignore]),
        comment,
        even,
        label,
        dc,
    ]));

    const parsed = parser.run(text).result.filter(([type]) => type !== ignore);

    const labelAddr = {};
    let cursor = 0;
    parsed.forEach(([type,  ...content]) => {
        if (type === lbl) {
            labelAddr[content[0].toLowerCase()] = cursor;
        } else if (type === data) {
            const [size, items] = content;
            cursor += size * items.length;
        }
    });

    const bytes = [];

    parsed.forEach((item) => {
        if (item[0] === data) {
            const [, size, items] = item;
            return [data, size, items.forEach(([type, value]) => {
                if (type === addr) {
                    const [left, right] = value.toLowerCase().split('-');
                    value = labelAddr[left] - labelAddr[right]; // mutate param (!)
                }
                bytes.push(...Array.from({ length: size }, (_, i) => {
                    return value >> (8 * i);
                }).reverse())
                return [type, value];
            })];
        }
    });

    return bytes;
}
