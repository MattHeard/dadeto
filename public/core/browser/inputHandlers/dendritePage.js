import { createDendriteHandler } from './createDendriteHandler.js';

const DENDRITE_PAGE_FIELDS = [
  ['optionId', 'Option ID'],
  ['content', 'Content'],
  ['firstOption', 'First option'],
  ['secondOption', 'Second option'],
  ['thirdOption', 'Third option'],
  ['fourthOption', 'Fourth option'],
];

export const dendritePageHandler = createDendriteHandler(DENDRITE_PAGE_FIELDS);
