import { describe, expect, test } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as impact from '../../src/core/local/checkImpactPlan.js';
import * as report from '../../src/core/local/checkFullReport.js';
import {
  impactContractCases,
  observeImpactContract,
} from '../fixtures/typed-logic/impact-contract.js';
import {
  reportContractCases,
  observeReportContract,
} from '../fixtures/typed-logic/report-contract.js';

const legacy = JSON.parse(
  readFileSync(
    new URL('../fixtures/typed-logic/legacy-contracts.json', import.meta.url),
    'utf8'
  )
);
const hash = value =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('pre-change public CLI/report compatibility', () => {
  test('uses the independently verified original implementation as its oracle', () => {
    expect(legacy.baselineCommit).toBe(
      '4dffaf1c0028eddaae46e59a96691a3e85bdb205'
    );
    expect(legacy.impact).toHaveLength(576);
    expect(legacy.report).toHaveLength(117);
  });

  for (const [index, entry] of impactContractCases().entries()) {
    test(`impact ${entry.name}`, () => {
      expect(legacy.impact[index].name).toBe(entry.name);
      expect(hash(observeImpactContract(impact, entry))).toBe(
        legacy.impact[index].sha256
      );
    });
  }

  for (const [index, entry] of reportContractCases().entries()) {
    test(`report ${entry.name}`, () => {
      expect(legacy.report[index].name).toBe(entry.name);
      expect(hash(observeReportContract(report, entry.input))).toBe(
        legacy.report[index].sha256
      );
    });
  }
});
