import { describe, it, expect, jest } from '@jest/globals';
import { setLocalTemporaryData as setData } from '../../src/core/browser/data.js';

describe('restoreBlogState via setLocalTemporaryData', () => {
  it('restores blog fetch fields when incoming state provides them', () => {
    const oldError = new Error('old');
    const oldPromise = Promise.resolve('old');
    const state = {
      blogStatus: 'loaded',
      blogError: oldError,
      blogFetchPromise: oldPromise,
      blog: { title: 'existing' },
    };

    const incomingState = {
      temporary: true,
      blogStatus: 'idle',
      blogError: new Error('new'),
      blogFetchPromise: Promise.resolve('new'),
      blog: { title: 'incoming' },
    };

    setData(
      { desired: incomingState, current: state },
      { logInfo: jest.fn(), logError: jest.fn() }
    );

    expect(state.blogStatus).toBe('loaded');
    expect(state.blogError).toBe(oldError);
    expect(state.blogFetchPromise).toBe(oldPromise);
    expect(state.blog).toEqual({ title: 'existing' });
  });
});
