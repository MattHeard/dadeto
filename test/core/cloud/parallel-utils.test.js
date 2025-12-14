import { runInParallel } from '../../../src/core/cloud/parallel-utils.js';

describe('runInParallel', () => {
  it('resolves every iterator call in parallel', async () => {
    const calls = [];
    const results = await runInParallel([1, 2], async value => {
      calls.push(value);
      return value * 2;
    });

    expect(calls).toEqual([1, 2]);
    expect(results).toEqual([2, 4]);
  });

  it('returns an empty array when no inputs are provided', async () => {
    await expect(
      runInParallel([], () => Promise.resolve('done'))
    ).resolves.toEqual([]);
  });
});
