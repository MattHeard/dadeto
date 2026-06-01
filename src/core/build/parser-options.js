const PARSER_PLUGINS = [
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
];

export const PARSER_OPTIONS = {
  allowAwaitOutsideFunction: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  plugins: PARSER_PLUGINS,
  sourceType: 'unambiguous',
};
