import {
  isTypeofComparison,
  recordClassificationSignal,
} from '../../src/core/scripts/classification-signals.js';

test('collects every distinct kind while preserving first signal identity and order', () => {
  const state = { signals: [], seenLabels: new Set(), seenSignals: new Set() };
  const comparison = {
    label: 'validator',
    kind: 'comparison_guard',
    line: 1,
    column: 2,
    detail: 'first',
  };
  const type = { ...comparison, kind: 'type_guard', line: 3 };
  const parse = {
    ...comparison,
    label: 'parser',
    kind: 'schema_parse',
    line: 4,
  };
  const sameKindOtherLabel = { ...parse, label: 'validator', line: 5 };
  recordClassificationSignal(null, state);
  recordClassificationSignal(comparison, state);
  recordClassificationSignal({ ...comparison, line: 99 }, state);
  recordClassificationSignal(type, state);
  recordClassificationSignal(parse, state);
  recordClassificationSignal(sameKindOtherLabel, state);
  expect(state.signals).toEqual([comparison, type, parse, sameKindOtherLabel]);
  expect(state.signals[0]).toBe(comparison);
  expect([...state.seenLabels]).toEqual(['validator', 'parser']);
  expect([...state.seenSignals]).toEqual([
    'validator:comparison_guard',
    'validator:type_guard',
    'parser:schema_parse',
    'validator:schema_parse',
  ]);
});

test.each([
  [{ type: 'Identifier' }, { type: 'Identifier' }, false],
  [{ type: 'UnaryExpression', operator: '!' }, { type: 'Identifier' }, false],
  [{ type: 'Identifier', operator: 'typeof' }, { type: 'Identifier' }, false],
  [
    { type: 'UnaryExpression', operator: 'typeof' },
    { type: 'Identifier' },
    true,
  ],
  [
    { type: 'Identifier' },
    { type: 'UnaryExpression', operator: 'typeof' },
    true,
  ],
  [{ type: 'Identifier' }, { type: 'UnaryExpression', operator: '!' }, false],
  [{ type: 'Identifier' }, { type: 'Identifier', operator: 'typeof' }, false],
])('classifies typeof operands %j / %j', (left, right, expected) => {
  expect(isTypeofComparison({ left, right })).toBe(expected);
});
