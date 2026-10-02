import { memoryObjectListAppend } from '../../../src/core/browser/toys/2026-08-18/memoryObjectListAppend.js';

test('list persistence reports a non-Error thrown by the environment', () => {
  const env = new Map([
    [
      'getData',
      () => {
        throw 'storage unavailable';
      },
    ],
  ]);
  expect(
    JSON.parse(
      memoryObjectListAppend(JSON.stringify({ path: 'items', object: {} }), env)
    )
  ).toEqual({
    appended: false,
    error: 'storage unavailable',
  });
});
