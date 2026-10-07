import eslintJs from '@eslint/js';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import tautologicalWrapperRule from './src/core/lint/tautological-wrapper.js';
import ts from 'typescript';
import { createAllowEffectsRule } from './src/core/scripts/allow-effects.js';

let capabilityProgramCache;

/**
 * Supply read-only compiler services at the external lint environment boundary.
 * @param {string} filename Current lint target.
 * @param {string} text Actual editor or rule-test source.
 * @returns {import('typescript').Program} Checked JavaScript compiler program.
 */
export function capabilityProgramFor(filename, text) {
  if (capabilityProgramCache?.filename === filename && capabilityProgramCache.text === text)
    return capabilityProgramCache.program;
  const options = { allowJs: true, checkJs: true, noEmit: true, types: [],
    lib: ['lib.es2023.d.ts'], target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10 };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, version, ...rest) => name === filename
    ? ts.createSourceFile(filename, text, version, true, ts.ScriptKind.JS)
    : getSourceFile(name, version, ...rest);
  const program = ts.createProgram([filename], options, host);
  capabilityProgramCache = { filename, text, program };
  return program;
}

const lintFiles = ['src/core/**/*.js', 'test/**/*.js'];
const tautologicalWrapperFiles = ['src/**/*.js'];
const repoLintPlugin = {
  rules: {
    'tautological-wrapper': tautologicalWrapperRule,
    'allow-effects': createAllowEffectsRule(ts, capabilityProgramFor),
  },
};

export default [
  {
    files: [
      'src/core/cloud/submit-new-story/**/*.js',
      'src/core/cloud/submit-new-page/**/*.js',
      'src/core/cloud/effectFetch.js',
      'src/core/browser/presenters/realtimeVoicePrototype.js',
      'src/core/browser/data.js',
      'src/core/browser/main.js',
      'src/core/browser/toys.js',
      'src/core/browser/webmcp.js',
      'src/core/browser/load-static-config-core.js',
      'src/core/browser/rentalSearch.js',
      'src/core/browser/admin-core.js',
      'src/core/browser/token-action.js',
      'src/core/browser/billing/billing-core.js',
      'src/core/browser/moderate.js',
      'src/core/browser/moderation/authedFetch.js',
      'src/core/browser/game/chronoflow/networkClock.js',
      'src/core/browser/game/chronoflow/pagePresenter.js',
      'src/core/browser/error-beacon.js',
      'src/core/browser/google-auth-cache.js',
      'src/core/cloud/errors/run.js',
      'src/core/cloud/render-support.js',
      'src/core/cloud/render-variant/render-variant-core.js',
      'src/core/cloud/render-contents/render-contents-core.js',
      'src/core/cloud/render-contents/index.js',
      'src/core/cloud/generate-stats/generate-stats-core.js',
      'src/core/local/notion-codex/notionApi.js',
      'src/core/local/notion-codex/outcomeStore.js',
      'src/core/local/notion-codex/stateStore.js',
      'src/core/local/documentStore.js',
      'src/core/local/process-launcher.js',
      'src/core/local/symphony/bootstrap.js',
      'src/core/local/symphony/app.js',
      'src/core/local/symphony/launch.js',
      'src/core/realtime/openaiRealtimeCalls.js',
      'src/core/cloud/generate-stats/cdn-invalidation.js',
      'src/core/local/gcp-simulator/simulator.js',
      'src/core/build/buildCore.js',
      'src/core/scripts/write-coverage-summary.js',
      'src/core/scripts/clone-scanner.js',
    ],
    plugins: { capability: repoLintPlugin },
    rules: { 'capability/allow-effects': 'error' },
  },
  {
    files: ['src/core/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/cloud/allow-effects.js', '**/local/allow-effects.js'],
              message:
                'Core may reference the AllowEffects type, but only external runtime boundaries may mint capabilities.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression[source.value=/allow-effects\\.js$/]',
          message: 'Core cannot dynamically import the capability factory.',
        },
        {
          selector:
            "CallExpression[callee.name='require'] > Literal[value=/allow-effects\\.js$/]",
          message: 'Core cannot require the capability factory.',
        },
      ],
    },
  },
  {
    linterOptions: { noInlineConfig: true },
  },
  {
    ignores: ['public/', '.stryker-tmp/', 'reports/'],
  },
  {
    files: lintFiles,
    ...jsdoc.configs['flat/recommended'],
  },
  {
    files: lintFiles,
    // Apply recommended rules and configure general JS settings
    ...eslintJs.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      jsdoc,
      prettier: prettierPlugin,
      repo: repoLintPlugin,
    },
    rules: {
      'no-else-return': 'warn',
      'no-useless-return': 'warn',
      'no-unused-vars': [
        'warn',
        { vars: 'all', args: 'after-used', ignoreRestSiblings: false },
      ],
      'no-console': 'off',
      eqeqeq: ['warn', 'always'],
      curly: ['warn', 'all'],
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-multi-spaces': 'warn',
      'no-trailing-spaces': 'warn',
      'no-duplicate-imports': 'warn',
      'no-implicit-coercion': 'warn',
      'dot-notation': 'warn',
      'max-depth': ['warn', 4],
      'max-lines-per-function': [
        'warn',
        { max: 450, skipBlankLines: true, skipComments: true },
      ],
      'max-statements': ['warn', 44],
      'max-params': ['warn', 4],
      indent: ['warn', 2],
      'jsdoc/require-jsdoc': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-param-type': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/reject-any-type': 'off',
      'jsdoc/reject-function-type': 'off',
      'jsdoc/escape-inline-tags': 'off',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/no-undefined-types': [
        'warn',
        {
          definedTypes: [
            'fetch',
            'globalThis.fetch',
            'Buffer',
            'setTimeout',
            'globalThis.setTimeout',
            'URL',
            'globalThis.URL',
            'Response',
            'Document',
            'Window',
            'Storage',
            'HTMLElement',
            'HTMLInputElement',
            'HTMLTextAreaElement',
            'HTMLSelectElement',
            'HTMLButtonElement',
            'HTMLAudioElement',
            'HTMLAnchorElement',
            'HTMLTableSectionElement',
            'HTMLTableCellElement',
            'Event',
            'EventTarget',
            'Node',
            'NodeList',
            'Text',
            'FileList',
            'KeyboardEvent',
            'Gamepad',
            'Headers',
            'Headers.entries',
            'MediaQueryList',
            'RTCPeerConnection',
            'MediaStream',
            'RTCDataChannel',
            'Location',
            'Crypto',
          ],
        },
      ],
      camelcase: ['warn', { properties: 'always' }],
      'prefer-template': 'warn',
      'consistent-return': 'warn',
      'no-unused-expressions': 'warn',
      'prettier/prettier': 'warn',
      // Add other project-specific rules here if needed
      'no-unreachable-loop': 'warn',
    },
  },
  {
    files: [
      'src/core/browser/presenters/battleshipSolitaireClues.js',
      'src/core/browser/toys/2025-03-29/get.js',
    ],
    rules: { complexity: ['warn', 4] },
  },
  {
    files: tautologicalWrapperFiles,
    plugins: {
      repo: repoLintPlugin,
    },
    rules: {
      'repo/tautological-wrapper': 'warn',
    },
  },
  {
    files: ['src/core/browser/inputHandlers/browserInputHandlersCore.js'],
    rules: {
      'no-restricted-globals': [
        'error',
        'event',
        'fdescribe',
        'fetch',
        'window',
        'document',
        'localStorage',
      ],
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],
      'no-param-reassign': 'warn',
      'no-return-assign': 'warn',
      'prefer-const': 'warn',
      'no-void': 'warn',
    },
  },
  {
    files: lintFiles,
    ...eslintConfigPrettier,
  },
  {
    // Specific configuration for test files
    files: ['test/**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
