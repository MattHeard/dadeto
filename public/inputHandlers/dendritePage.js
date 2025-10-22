import { DENDRITE_PAGE_FIELDS } from '../core/constants/dendrite.js';
import { createDendriteHandler } from './createDendriteHandler.js';

export const dendritePageHandler = createDendriteHandler(DENDRITE_PAGE_FIELDS);
