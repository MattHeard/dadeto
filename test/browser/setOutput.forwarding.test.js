import { describe, it, expect, jest } from '@jest/globals';

describe('setOutput forwarding', () => {
  it('forwards input and env to the output section setter', async () => {
    const outputSetter = jest.fn(() => 'ok');

    await jest.unstable_mockModule(
      '../../src/core/browser/createSectionSetter.js',
      () => ({
        createSectionSetter: jest.fn(() => outputSetter),
      })
    );

    const { setOutput } = await import('../../src/core/browser/setOutput.js');
    const env = new Map();

    expect(setOutput('payload', env)).toBe('ok');
    expect(outputSetter).toHaveBeenCalledWith('payload', env);
  });
});
