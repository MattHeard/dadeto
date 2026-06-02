import { RuleTester } from 'eslint';
import tautologicalWrapperRule from '../../../src/core/lint/tautological-wrapper.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

ruleTester.run('tautological-wrapper', tautologicalWrapperRule, {
  valid: [
    {
      code: `
        import { forward } from './forward.js';
        const wrap = value => forward(value.trim());
      `,
    },
    {
      code: `
        import { forward } from './forward.js';
        function wrap(value) {
          if (!value) {
            return '';
          }

          return forward(value);
        }
      `,
    },
    {
      code: `
        import { forward } from './forward.js';
        function wrap(value) {
          console.log(value);
          return forward(value);
        }
      `,
    },
    {
      code: `
        import { forward } from './forward.js';
        function wrap(value) {
          return forward(value) + '!';
        }
      `,
    },
    {
      code: `
        import { forward } from './forward.js';
        async function wrap(value) {
          return forward(value);
        }
      `,
    },
    {
      code: `
        import { forward } from './forward.js';
        /* tautological-wrapper: allow */
        function wrap(value) {
          return forward(value);
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { forward } from './forward.js';
        function wrap(value) {
          return forward(value);
        }
      `,
      errors: [{ messageId: 'tautologicalWrapper' }],
    },
    {
      code: `
        import * as api from './api.js';
        const wrap = value => api.forward(value);
      `,
      errors: [{ messageId: 'tautologicalWrapper' }],
    },
  ],
});
