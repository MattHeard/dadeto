import path from 'path';
import { createCopyToInfraCore } from '../../../src/core/cloud/copy.js';

describe('copy core test hooks', () => {
  const helpers = createCopyToInfraCore({
    projectRoot: '/tmp',
    path: {
      join: path.join,
      dirname: path.dirname,
      relative: path.relative,
      extname: path.extname,
    },
  });
  const { copyCoreTestUtils } = helpers;

  test('shouldCopyDeclaredFiles returns false when plan missing', () => {
    expect(copyCoreTestUtils.shouldCopyDeclaredFiles(undefined)).toBe(false);
  });

  test('shouldCopyDeclaredFiles returns true when files provided', () => {
    expect(
      copyCoreTestUtils.shouldCopyDeclaredFiles({ files: ['foo.js'] })
    ).toBe(true);
  });

  test('isNonEmptyArray detects non-empty arrays', () => {
    expect(copyCoreTestUtils.isNonEmptyArray([1])).toBe(true);
    expect(copyCoreTestUtils.isNonEmptyArray([])).toBe(false);
  });
});
