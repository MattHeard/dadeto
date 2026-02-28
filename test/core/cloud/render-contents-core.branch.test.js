import { renderContentsTestUtils } from '../../../src/core/cloud/render-contents/render-contents-core.js';

describe('renderContentsTestUtils', () => {
  test('getDefaultConsoleError returns a function', () => {
    const fn = renderContentsTestUtils.getDefaultConsoleError();
    expect(typeof fn).toBe('function');
  });

  test('getDefaultConsoleError falls back when console.error missing', () => {
    const original = console.error;
    // @ts-expect-error -- temporarily remove console.error
    console.error = undefined;

    const fn = renderContentsTestUtils.getDefaultConsoleError();
    expect(typeof fn).toBe('function');
    expect(() => fn('ignored')).not.toThrow();

    console.error = original;
  });
});
