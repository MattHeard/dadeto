import eslintJs from '@eslint/js';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

const lintFiles = ['src/core/**/*.js', 'test/**/*.js'];

export default [
  { ignores: ['public/', '.stryker-tmp/', 'reports/'] },
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
    },
    rules: {
      complexity: ['warn', { max: 2 }],
      'no-ternary': 'warn',
      'no-nested-ternary': 'warn',
      'no-else-return': 'warn',
      'no-unneeded-ternary': 'warn',
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
        { max: 231, skipBlankLines: true, skipComments: true },
      ],
      'max-statements': ['warn', 35],
      'max-params': ['warn', 3],
      indent: ['warn', 2],
      'jsdoc/require-jsdoc': 'warn',
      'jsdoc/check-tag-names': 'warn',
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
    files: ['src/core/**/*.js'],
    rules: {
      'no-restricted-globals': ['warn', 'event', 'fdescribe'],
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
    rules: {
      complexity: 'off',
      'no-ternary': 'off',
      'no-nested-ternary': 'off',
      'no-else-return': 'off',
      'no-unneeded-ternary': 'off',
      'no-useless-return': 'off',
      camelcase: 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      'max-params': 'off',
    },
  },
];
