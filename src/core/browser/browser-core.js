export * from './browserUtilities.js';
import { createDendriteHandler } from './inputHandlers/createDendriteHandler.js';

/** @type {Array<[string, string]>} */
const DENDRITE_OPTION_FIELDS = [
  ['content', 'Content'],
  ['firstOption', 'First option'],
  ['secondOption', 'Second option'],
  ['thirdOption', 'Third option'],
  ['fourthOption', 'Fourth option'],
];

/**
 * Build the field definitions for the dendrite page handler.
 * @returns {Array<[string, string]>} Field key/label tuples including the option ID.
 */
function getDendritePageFields() {
  return [['optionId', 'Option ID'], ...DENDRITE_OPTION_FIELDS];
}

/**
 * Build the field definitions for the dendrite story handler.
 * @returns {Array<[string, string]>} Field key/label tuples including the title.
 */
function getDendriteFields() {
  return [['title', 'Title'], ...DENDRITE_OPTION_FIELDS];
}

export const dendritePageHandler = createDendriteHandler(
  getDendritePageFields()
);
export const dendriteStoryHandler = createDendriteHandler(getDendriteFields());
