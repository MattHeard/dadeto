import { RuleTester } from 'eslint';
import { expect, test } from '@jest/globals';
import createNoParameterBagAritySmugglingRule, {
  parameterBagRuleTestUtils,
} from '../../../src/core/lint/no-parameter-bag-arity-smuggling.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
});

ruleTester.run(
  'no-parameter-bag-arity-smuggling',
  createNoParameterBagAritySmugglingRule(),
  {
    valid: [
      {
        name: 'a destructured bag at or below the effective limit is allowed',
        code: `function select(resources, fallback) {
          const { db, auth } = resources;
          return db ?? auth ?? fallback;
        }`,
      },
      {
        name: 'a cohesive object passed as a whole is not expanded',
        code: `function configure(resources, first, second, third) {
          const { db, auth, app } = resources;
          consume(resources);
          return [db, auth, app, first, second, third];
        }`,
      },
      {
        name: 'ordinary four-parameter functions remain unaffected',
        code: 'function combine(first, second, third, fourth) { return first; }',
      },
      {
        name: 'one binding from a destructured object does not expand arity',
        code: 'function read(resources, one, two, three) { const { db } = resources; return db; }',
      },
      {
        name: 'nested and rest object bindings count as leaves',
        code: 'function read({ db, nested: { auth }, ...rest }, one) { return [db, auth, rest, one]; }',
      },
      {
        name: 'expression-bodied functions and destructuring declarations are supported',
        code: 'const read = resources => resources.db;',
      },
      {
        name: 'array holes do not add bindings',
        code: 'function read({ values: [first, , second] }, third) { return [first, second, third]; }',
      },
      {
        name: 'non-identifier parameter patterns are ignored by the bag expansion',
        code: 'function read([first, second] = [], third, fourth) { return [first, second, third, fourth]; }',
      },
      {
        name: 'direct property reads do not count as whole-object use',
        code: 'function read(resources, first, second) { const { db, auth } = resources; return resources.db ?? db ?? auth ?? first ?? second; }',
      },
    ],
    invalid: [
      {
        name: 'the firebaseResources transport pattern reports effective arity',
        code: `function setupAssignModerationJobRoute(
          firebaseResources, createRunVariantQuery, now, random
        ) {
          const { db, auth, app } = firebaseResources;
          return [db, auth, app, createRunVariantQuery, now, random];
        }`,
        errors: [
          {
            messageId: 'excessiveEffectiveArity',
            data: { syntacticArity: 4, effectiveArity: 6, maximumArity: 4 },
          },
        ],
      },
      {
        name: 'a direct object-pattern parameter contributes its leaf bindings',
        code: `function register({ app, db, auth }, route, now, random) {
          return [app, db, auth, route, now, random];
        }`,
        errors: [
          {
            messageId: 'excessiveEffectiveArity',
            data: { syntacticArity: 4, effectiveArity: 6, maximumArity: 4 },
          },
        ],
      },
      {
        name: 'nested destructuring counts every leaf binding',
        code: `function configure(resources, first, second) {
          const { db, nested: { auth, app } } = resources;
          return [db, auth, app, first, second];
        }`,
        errors: [
          {
            messageId: 'excessiveEffectiveArity',
            data: { syntacticArity: 3, effectiveArity: 5, maximumArity: 4 },
          },
        ],
      },
      {
        name: 'defaulted nested binding counts its bound identifier',
        code: 'function configure({ db = fallback, nested: { auth } }, first, second) { return [db, auth, first, second]; }',
        errors: [
          {
            messageId: 'excessiveEffectiveArity',
            data: { syntacticArity: 3, effectiveArity: 4, maximumArity: 3 },
          },
        ],
        options: [3],
      },
      {
        name: 'array nested in object patterns contributes each bound leaf',
        code: 'function configure({ resources: [db, auth] }, first, second) { return [db, auth, first, second]; }',
        errors: [
          {
            messageId: 'excessiveEffectiveArity',
            data: { syntacticArity: 3, effectiveArity: 4, maximumArity: 3 },
          },
        ],
        options: [3],
      },
    ],
  }
);

test('binding counter handles the remaining ESTree binding shapes', () => {
  expect(
    parameterBagRuleTestUtils.boundLeafCount({
      type: 'RestElement',
      argument: { type: 'Identifier', name: 'rest' },
    })
  ).toBe(1);
  expect(
    parameterBagRuleTestUtils.boundLeafCount({
      type: 'ArrayPattern',
      elements: [
        { type: 'Identifier', name: 'first' },
        null,
        { type: 'Identifier', name: 'second' },
      ],
    })
  ).toBe(2);
  expect(
    parameterBagRuleTestUtils.boundLeafCount({
      type: 'MemberExpression',
    })
  ).toBe(0);
});
