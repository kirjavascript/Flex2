import {
    char,
    sequenceOf,
    many,
    anythingExcept,
    choice,
    recursiveParser,
    // optionalWhitespace,
    str,
    anyOfString,
    letters,
    regex,
    skip,
    endOfInput,
} from 'arcsecond';

const parseExpr = recursiveParser(() => many(choice ([
    // optionalWhitespace,
    comment,
    sexpr,
  // parseNumber,
  // parseBool,
  // parseNull,
  // parseString,
  // parseArray,
  // parseObject,
    // parseString,
])));

// parseArgs


const sexpr = sequenceOf([
    char('('),
    letters,
    /// args
    char(')'),
]).map(([,ident]) => ({ type: 'sexpr', ident }));

const comment = sequenceOf([
    char(';'),
    regex(/^.*$/m)
]).map(([,comment]) => ({ type: 'comment', comment }));


// const join = seperator => array => array.join(seperator);
// const escapedQuote = sequenceOf ([ str ('\\'), anyOfString (`"'`) ]).map(x => x.join(''));



// const parseString = sequenceOf([
//     char('"'),
//     many(choice([escapedQuote, anythingExcept(char('"'))])).map(join('')),
//     char('"'),
// ]).map(([,x]) => ({string:x}));

const input = `
(info) ; this is a comment
(test)
; comment
`;
// (text "hello")
// (test (test))
// (test (test (test)))
//

// TODO: asm parser
// TODO: arcsecond-binary

// compare index to length
console.log(parseExpr.run(input))
