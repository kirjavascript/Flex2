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

const parser = recursiveParser(() => many(choice ([
    whitespace,
    comment,
    // sexpr,
  // parseNumber,
  // parseBool,
  // parseNull,
  // parseString,
  // parseArray,
  // parseObject,
    // parseString,
    info,
    dplc,
    add,
])));

const whitespaceSymbol = Symbol('whitespace');
const whitespace = rawWhitespace.map(() => whitespaceSymbol);

const arg = (arg) => composeParsers([arg, whitespace]);

const sexpr = (fn) => {
    const [head, ...tail] = fn();
    return (
        sequenceOf([
            char('('),
            takeLeft(sequenceOf([head, ...tail.map(arg)]))(char(')')),
        ]).map(([, ...args]) => args)
    );
};

// const sexpr = ([head, ...tail]) => sequenceOf([
//     char('('),
//     takeLeft(sequenceOf([head, ...tail.map(arg)]))(char(')')),
// ]).map(([, ...args]) => args);

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

const token = () => many1(anyOfString('TBLRPC')).map(() => ({ type: 'tokens', }));

const definition = recursiveParser(() => many(choice([
    number,
    token,
])));

const add = sexpr(() => [
    str('add'),
    // definition,
]);

const dplc = sexpr(() => [
    str('dplc'),
    // definition,
]);



const tokens = {
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


// const dplc

// be able to parse from bits to byte / word / long
// then do operations
// definition
// add sub reverse

// const join = seperator => array => array.join(seperator);
// const escapedQuote = sequenceOf ([ str ('\\'), anyOfString (`"'`) ]).map(x => x.join(''));



// const parseString = sequenceOf([
//     char('"'),
//     many(choice([escapedQuote, anythingExcept(char('"'))])).map(join('')),
//     char('"'),
// ]).map(([,x]) => ({string:x}));

const input = `
(info) ; this is a comment
(dplc XYXY AAAA)
`;

// whitespace symbol

// (text "hello")
// (test (test))
// (test (test (test)))
//

// TODO: asm parser
// TODO: arcsecond-binary

// compare index to length
console.log(parser.run(input))
