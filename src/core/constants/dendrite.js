export const DENDRITE_FIELDS = [
  ['title', 'Title'],
  ['content', 'Content'],
  ['firstOption', 'First option'],
  ['secondOption', 'Second option'],
  ['thirdOption', 'Third option'],
  ['fourthOption', 'Fourth option'],
];

export const DENDRITE_PAGE_FIELDS = [
  ['optionId', 'Option ID'],
  ['content', 'Content'],
  ['firstOption', 'First option'],
  ['secondOption', 'Second option'],
  ['thirdOption', 'Third option'],
  ['fourthOption', 'Fourth option'],
];

export const DENDRITE_OPTION_KEYS = DENDRITE_FIELDS.map(([key]) => key).filter(
  key => key.endsWith('Option')
);
