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
      camelcase: 'off',
      'max-params': 'off',
    },
  },
  {
    files: ['src/core/cloud/http-method-guard.js'],
    rules: {
      complexity: 'off',
    },
  },
];
