import {
    char,
    sequenceOf,
    many,
    many1,
    digits,
    anythingExcept,
    composeParsers,
    choice,
    recursiveParser,
    whitespace as rawWhitespace,
    everythingUntil,
optionalWhitespace,
    str,
    anyOfString,
    possibly,
    letters,
    regex,
    skip,
    endOfInput,
    takeLeft,
    takeRight,
    sepBy,
} from 'arcsecond';

const whitespaceSymbol = Symbol('whitespace');
const whitespace = rawWhitespace.map(() => whitespaceSymbol);

const parser = recursiveParser(() => many(choice ([
    whitespace,
    comment,
    info,
    dplc,
]))).map(items => items.filter(d => d !== whitespaceSymbol));

const param = (param) => composeParsers([param, whitespace]);

// const

const sexpr = (fn) => {
    const [head, ...tail] = fn();
    const params = sequenceOf([head, ...tail.map(param)]);
    return (
        composeParsers([
            takeLeft(params) (sequenceOf([optionalWhitespace, char(')')])),
            sequenceOf([char('('), optionalWhitespace]),
        ])
    );
};


const comment = sequenceOf([
    char(';'),
    regex(/^.*$/m)
]).map((comment) => ({ type: 'comment', comment: comment.join('') }));

const info = sexpr(() => [ str('info') ]).map(() => ({ type: 'info' }));

const number = choice([
    sequenceOf([
        char('#'),
        digits,
    ]).map(([, digits]) => +digits),
    sequenceOf([
        str('#$'),
        regex(/^[A-F0-9]+/i),
    ]).map(([, hex]) => +`0x${hex}`),
]);

const tokenList = {
    'T': 'top',
    'L': 'left',
    'R': 'right',
    'B': 'bottom',
    'W': 'width',
    'H': 'height',
    'P': 'priority',
    'C': 'palette',
    'Y': 'vflip',
    'X': 'hflip',
    'A': 'art',
    'N': 'size',
};

const token = many1(anyOfString(Object.keys(tokenList).join('')))
    .map((tokens) => tokens.map(token => ({ type: 'token', token: tokenList[token] })));

const definition = recursiveParser(() => many(choice([
    number,
    token,
    add,
    reverse,
])));



const add = sexpr(() => [
    str('add'),
    number,
    definition,
]).map(([, expr]) => ({ type: 'op', expr }));

const reverse = sexpr(() => [
    str('reverse'),
    definition,
]).map(([, expr]) => ({ type: 'op', expr }));

const dplc = sexpr(() => [
    str('dplc'),
    sepBy(whitespace)(definition),
]).map(([, expr]) => ({ type: 'dplc', expr }));

// definition list
// operation
// size




// ASM & binary out first (tedmediate format)
//
// read / write
//
// be able to parse from bits to byte / word / long
// then do operations
// definition

// const parseString = sequenceOf([
//     char('"'),
//     many(choice([escapedQuote, anythingExcept(char('"'))])).map(join('')),
//     char('"'),
// ]).map(([,x]) => ({string:x}));

const input = `
(offset-table dc.b)
(mapping-header LLLL)
(mapping TTTTTTTT 0000  WW HH P CC Y X AAAAAAAAAAA LLLLLLLL)
;(info) ; this is a comment
;( dplc YXYA (reverse (add #$1 AAA)))
;( dplc AAAA AAAA (add #3 AAA) )
`;

// whitespace symbol

// (text "hello")
// (test (test))
// (test (test (test)))
//

// TODO: asm parser
// TODO: arcsecond-binary

// compare index to length
const out = parser.run(input);
const diff = input.length - out.index;
if (diff > 0) {
    // todo: line column (highlight?)
    console.log(diff);
}
console.log(out.result)
console.log(out.result[2])
