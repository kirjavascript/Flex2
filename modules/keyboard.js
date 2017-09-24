import { environment } from '#store/environment';
import { mappingState } from '#components/mappings/state';
import Mousetrap from 'mousetrap';

// mod = ctrl / cmd

Mousetrap.bind('mod+a', () => {
    mappingState.selectAll();
});

Mousetrap.bind('mod+d', () => {
    mappingState.selectNone();
});

// cut, paste

/*
 * [] = nav sprite
 * {} = nav tile
 * arrows = move piece(s)
 * shift = *8
 */
