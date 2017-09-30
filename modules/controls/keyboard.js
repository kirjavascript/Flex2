import Mousetrap from 'mousetrap';
import { commands } from './commands';
import flatten from 'lodash/flatten';

flatten(commands)
    .forEach(({map, func, hasShift}) => {
        if (hasShift) {
            Mousetrap.bind([map, `shift+${map}`], func);
        }
        else {
            Mousetrap.bind(map, func);
        }
    });
