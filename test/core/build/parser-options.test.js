import { PARSER_OPTIONS } from '../../../src/core/build/parser-options.js';

describe('PARSER_OPTIONS', () => {
  it('enables the supported parser syntax and permissive source mode', () => {
    expect(PARSER_OPTIONS).toEqual({
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
      plugins: [
        'jsx',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'decorators-legacy',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'nullishCoalescingOperator',
        'optionalChaining',
        'topLevelAwait',
      ],
      sourceType: 'unambiguous',
    });
  });
});
