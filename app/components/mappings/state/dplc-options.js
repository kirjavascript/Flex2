import { mappingState } from './index';

// formats fit entries to their own limits on save, these only shape the editor
export function dplcOptions() {
    return mappingState.uncappedDPLCs
        ? { maxSize: Infinity, matchMetadata: true }
        : { maxSize: 16, matchMetadata: false };
}
