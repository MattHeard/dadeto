import { formatListenErrorMessage } from '../../src/local/serverMessages.js';

describe('serverMessages', () => {
  test('explains how to start the writer server when port binding is denied', () => {
    expect(formatListenErrorMessage(4321)).toBe(
      [
        'writer server could not bind to port 4321.',
        'This usually happens when the process is started inside a restricted sandbox.',
        'Start it from a full shell instead, for example:',
        '  npm run start:writer:watch',
        'Then open http://localhost:4321/writer/',
      ].join('\n')
    );
  });
});
