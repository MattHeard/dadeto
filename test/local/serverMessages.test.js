import {
  formatListenErrorMessage,
  formatSymphonyListenErrorMessage,
} from '../../src/local/serverMessages.js';

describe('serverMessages', () => {
  test('explains how to start the writer server when port binding is denied', () => {
    expect(formatListenErrorMessage(4321)).toBe(
      [
        'writer server could not bind to port 4321.',
        'This usually happens when the process is started inside a restricted sandbox.',
        'Start it from a full shell instead, for example:',
        '  npm run start:writer:playwright',
        'Then open http://localhost:4321/writer/',
      ].join('\n')
    );
  });

  test('explains how to start the symphony server when port binding is denied', () => {
    expect(formatSymphonyListenErrorMessage(4322)).toBe(
      [
        'symphony server could not bind to port 4322.',
        'This usually happens when the process is started inside a restricted sandbox.',
        'Start it from a full shell instead, for example:',
        '  npm run start:symphony',
        'Then open http://localhost:4322/api/symphony/status',
      ].join('\n')
    );
  });
});
