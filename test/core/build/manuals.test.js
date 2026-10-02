import { jest } from '@jest/globals';
import { publishManuals } from '../../../src/core/build/manuals.js';

test('publishes only referenced canonical Markdown assets', () => {
  const io = { mkdirSync: jest.fn(), copyFileSync: jest.fn() };
  publishManuals(
    {
      posts: [
        {},
        {
          content: [
            'text',
            { type: 'manual' },
            { type: 'manual', src: '/manuals/mosslight-valley.md' },
          ],
        },
      ],
    },
    io
  );
  expect(io.copyFileSync).toHaveBeenCalledWith(
    'docs/toys/mosslight-valley/manual.md',
    'public/manuals/mosslight-valley.md'
  );
});

test('rejects unsafe resource paths', () => {
  expect(() =>
    publishManuals(
      { posts: [{ content: [{ type: 'manual', src: '/../secret' }] }] },
      { mkdirSync() {} }
    )
  ).toThrow('Invalid manual source');
});
