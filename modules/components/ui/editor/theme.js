import { blue, grey, white, white2, black, green, red, yellow2 } from 'sass-variables-loader!#styles/variables.scss';

ace.define('ace/theme/flex',['require','exports','module','ace/lib/dom'], function(acequire, exports, module) {

    exports.isDark = false;
    exports.cssClass = 'ace-flex';
    exports.cssText = `
        .ace-flex {
            background-color: ${black};
            color: ${white};
            border: 1px solid ${grey};
        }
        .ace-flex .ace_gutter {
            background: ${grey};
            color: ${white};
            padding-right: 10px;
        }

        .ace-flex .ace_marker-layer .ace_selection {
          background: ${grey};
        }

        .ace-flex .ace_cursor {
            color: ${blue};
        }
        .ace-flex.normal-mode .ace_cursor {
            background-color: ${blue} !important;
            border: 1px solid ${blue} !important;
        }
        .ace-flex.normal-mode .ace_hidden-cursors .ace_cursor {
            background-color: transparent !important;
        }

        .ace-flex .ace_entity.ace_name.ace_tag,
        .ace-flex .ace_meta.ace_tag,
        .ace-flex .ace_constant,
        .ace-flex .ace_storage {
            color: ${red}
        }

        /* syntax */

        .ace-flex .ace_keyword{
            color: ${blue}
        }

        .ace-flex .ace_comment {
            color: ${white2};
            font-style: italic;
        }

        .ace-flex .ace_number {
            color: ${yellow2};
        }
    `;

    let dom = acequire('../lib/dom');
    dom.importCssString(exports.cssText, exports.cssClass);
});
