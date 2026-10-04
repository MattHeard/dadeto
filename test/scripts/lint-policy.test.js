import { Linter } from 'eslint';
import config from '../../eslint.config.js';

test('inline directives cannot hide repository lint violations', () => {
  const messages = new Linter().verify(
    '/* eslint-disable no-unused-vars */\nconst unusedValue = 1;\n',
    config,
    { filename: 'src/core/inline-policy-probe.js' }
  );
  expect(messages).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ ruleId: 'no-unused-vars', severity: 1 }),
      expect.objectContaining({
        severity: 1,
        message: expect.stringContaining('noInlineConfig'),
      }),
    ])
  );
});

test.each([
  'src/core/browser/presenters/battleshipSolitaireClues.js',
  'src/core/browser/toys/2025-03-29/get.js',
])('central policy retains the original complexity limit for %s', filename => {
  const source = [
    'export function probe(flags) {',
    '  if (flags.a) return 1;',
    '  if (flags.b) return 2;',
    '  if (flags.c) return 3;',
    '  if (flags.d) return 4;',
    '  return 0;',
    '}',
  ].join('\n');
  expect(new Linter().verify(source, config, { filename })).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ ruleId: 'complexity', severity: 1 }),
    ])
  );
});
