import { expect, test } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderCheckFullReportMarkdown } from '../../../../src/logic/core/local/checkFullReport.js';
import {
  reportJsonContractCases,
  observeReportJson,
} from '../../../fixtures/typed-logic/report-json-contract.js';
import { buildReportJsonFixture } from '../../../fixtures/typed-logic/report-json-pipeline.js';

const legacy = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/report-json-contracts.json',
      import.meta.url
    ),
    'utf8'
  )
);
const hash = value =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('the raw JSON oracle comes from the independent pre-migration implementation', () => {
  expect(legacy.baselineCommit).toBe(
    '4dffaf1c0028eddaae46e59a96691a3e85bdb205'
  );
  expect(legacy.cases).toHaveLength(784);
});

for (const [index, input] of reportJsonContractCases().entries()) {
  test(`preserves raw JSON outcome ${input.name}`, () => {
    expect(legacy.cases[index].name).toBe(input.name);
    expect(
      hash(
        observeReportJson(
          buildReportJsonFixture,
          renderCheckFullReportMarkdown,
          input
        )
      )
    ).toBe(legacy.cases[index].sha256);
  });
}
