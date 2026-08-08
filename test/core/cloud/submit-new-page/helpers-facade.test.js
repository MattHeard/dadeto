import {
  findExistingOption,
  findExistingPage,
  parseIncomingOption,
} from '../../../../src/core/cloud/submit-new-page/helpers.js';

describe('submit new page helpers facade', () => {
  it('forwards parsing and database lookup helpers', async () => {
    expect(parseIncomingOption('12-Alpha-34')).toEqual({
      pageNumber: 12,
      variantName: 'Alpha',
      optionNumber: 34,
    });
    await expect(findExistingOption(null, null)).resolves.toBeNull();
    await expect(findExistingPage(null, 1)).resolves.toBeNull();
  });
});
