import { blue, grey, white, black, green } from 'sass-variables-loader!#styles/variables.scss';

ace.define('ace/theme/flex',['require','exports','module','ace/lib/dom'], function(acequire, exports, module) {

    exports.isDark = false;
    exports.cssClass = 'ace-flex';
    exports.cssText = `
        .ace-flex-wrap {
            border: 1px solid ${grey};
        }
        .ace-flex {
            background-color: ${black};
            color: ${white};
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
  color: #E06C75
}

.ace-flex .ace_keyword{
  color: #61AFEF
}

.ace-flex .ace_punctuation,
.ace-flex .ace_punctuation.ace_tag {
  color: #ABB2BF
}

.ace-flex .ace_constant.ace_support.ace_fonts,
.ace-flex .ace_constant.ace_character,
.ace-flex .ace_constant.ace_support,
.ace-flex .ace_constant.ace_language,
.ace-flex .ace_constant.ace_numeric,
.ace-flex .ace_constant.ace_other {
  color: #D19A66
}



.ace-flex .ace_invalid {
  color: #F8F8F0;
  background-color: #F92672
}

.ace-flex .ace_invalid.ace_deprecated {
  color: #F8F8F0;
  background-color: #AE81FF
}

.ace-flex .ace_support.ace_type{
    color: #ABB2BF
}

.ace-flex .ace_constant.ace_language.ace_escape,
.ace-flex .ace_keyword.ace_operator,
.ace-flex .ace_support.ace_function {
  color: #56B6C2
}

.ace-flex .ace_fold {
  background-color: #A6E22E;
  border-color: #ABB2BF
}

.ace-flex .ace_storage.ace_type{
    color: #C678DD;
}


.ace-flex .ace_support.ace_class {
  font-style: italic;
  color: #66D9EF
}

.ace-flex .ace_entity.ace_other,
.ace-flex .ace_entity.ace_other.ace_attribute-name,
.ace-flex .ace_variable {
  color: #D19A66
}

.ace-flex .ace_string,
.ace-flex .ace_list.ace_markup,
.ace-flex .ace_constant.ace_language.ace_escape .ace_string,
.ace-flex .ace_string.ace_attribute-value {
    color: #98C379
}

.ace-flex .ace_entity.ace_name.ace_function {
  color: #61AFEF
}

.ace-flex .ace_operator {
    color: #ABB2BF;
}

/*.ace-flex .ace_string, */
.ace-flex .ace_identifier,
.ace-flex .ace_variable.ace_parameter{
  color: #ABB2BF
}

.ace-flex .ace_comment {
  color: #5C6370;
  font-style: italic;
}
    `;

    let dom = acequire('../lib/dom');
    dom.importCssString(exports.cssText, exports.cssClass);
});
