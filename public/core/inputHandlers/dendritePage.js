import { DENDRITE_PAGE_FIELDS } from '../constants/dendrite.js';
import { createDendriteHandler } from './createDendriteHandler.js';

export const dendritePageHandler = createDendriteHandler(DENDRITE_PAGE_FIELDS);
