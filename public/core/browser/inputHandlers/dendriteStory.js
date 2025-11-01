import { createDendriteHandler } from './createDendriteHandler.js';

const DENDRITE_FIELDS = [
  ['title', 'Title'],
  ['content', 'Content'],
  ['firstOption', 'First option'],
  ['secondOption', 'Second option'],
  ['thirdOption', 'Third option'],
  ['fourthOption', 'Fourth option'],
];

export const dendriteStoryHandler = createDendriteHandler(DENDRITE_FIELDS);
