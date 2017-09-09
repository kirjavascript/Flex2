// https://ace.c9.io/#nav=higlighter&api=editor

ace.define('ace/mode/flex_highlight_rules',['require','exports','module','ace/lib/oop','ace/mode/text_highlight_rules'], function(acequire, exports, module) {
    'use strict';

    let oop = acequire('../lib/oop');
    let TextHighlightRules = acequire('./text_highlight_rules').TextHighlightRules;

    let FlexHighlightRules = function() {

        this.$rules = {
            start: [
                { token: 'comment', regex: ';.*$' },
                { token: 'keyword', regex: /(headerSize|mappingDefinition|dplcDefinition)/ },
                { token: ['fn-bracket', 'number', 'fn-bracket'], regex: /(\()(\d+)(\))/ },
            ],
        };

        this.normalizeRules();
    };

    FlexHighlightRules.metaData = { fileTypes: [ 'asm' ],
        name: 'Flex Definition Format',
        scopeName: 'source' };

    oop.inherits(FlexHighlightRules, TextHighlightRules);

    exports.FlexHighlightRules = FlexHighlightRules;
});


ace.define('ace/mode/flex',['require','exports','module','ace/lib/oop','ace/mode/text','ace/mode/flex_highlight_rules'], function(acequire, exports, module) {

    let oop = acequire('../lib/oop');
    let TextMode = acequire('./text').Mode;
    let FlexHighlightRules = acequire('./flex_highlight_rules').FlexHighlightRules;

    let Mode = function() {
        this.HighlightRules = FlexHighlightRules;
        this.$behaviour = this.$defaultBehaviour;
    };
    oop.inherits(Mode, TextMode);

    (function() {
        this.lineCommentStart = ';';
        this.$id = 'ace/mode/flex';
    }).call(Mode.prototype);

    exports.Mode = Mode;
});
