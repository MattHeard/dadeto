import { jest } from '@jest/globals';

const runCopyWorkflow = jest.fn();
const createCopyCoreMock = jest.fn(() => ({ runCopyWorkflow }));

jest.unstable_mockModule('../../src/core/build/blog.js', () => ({
  createCopyCore: createCopyCoreMock,
}));

const { runCore } = await import('../../src/core/build/runCore.js');

describe('runCore', () => {
  test('creates copy core and runs workflow', () => {
    const deps = { now: Date.now };
    runCore(deps);

    expect(createCopyCoreMock).toHaveBeenCalledWith(deps);
    expect(runCopyWorkflow).toHaveBeenCalledTimes(1);
  });
});
