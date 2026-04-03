import { describe, expect, it } from '@jest/globals';
import {
  calculateRealHourlyWage,
  realHourlyWageToy,
  realHourlyWageToyTestOnly,
} from '../../../src/core/browser/toys/2026-04-03/realHourlyWage.js';

describe('realHourlyWage', () => {
  it('calculates nominal and real hourly wage from a normalized input', () => {
    const input = {
      period: {
        paidWorkHours: 160,
        grossIncome: 5000,
        netIncome: 3200,
      },
      overhead: {
        commuteHours: 20,
        prepHours: 5,
        recoveryHours: 10,
        adminHours: 4,
        overtimeHours: 2,
        otherWorkHours: 1,
        directWorkExpenses: 120,
        commuteExpenses: 40,
        foodExpenses: 15,
        clothingExpenses: 25,
        otherWorkExpenses: 10,
      },
    };

    expect(calculateRealHourlyWage(input)).toEqual({
      nominalHourlyWage: 31.25,
      realHourlyWage: 14.801980198019802,
      totalWorkRelatedHours: 202,
      totalWorkRelatedExpenses: 210,
      adjustedNetIncome: 2990,
      breakdown: {
        paidWorkHours: 160,
        overheadHours: 42,
        totalHours: 202,
        directHoursByType: {
          commuteHours: 20,
          prepHours: 5,
          recoveryHours: 10,
          adminHours: 4,
          overtimeHours: 2,
          otherWorkHours: 1,
        },
        expensesByType: {
          directWorkExpenses: 120,
          commuteExpenses: 40,
          foodExpenses: 15,
          clothingExpenses: 25,
          otherWorkExpenses: 10,
        },
      },
    });
  });

  it('returns null wages when the denominator is zero', () => {
    const input = {
      period: {
        paidWorkHours: 0,
        grossIncome: 4000,
        netIncome: 2500,
      },
      overhead: {},
    };

    expect(calculateRealHourlyWage(input)).toEqual({
      nominalHourlyWage: null,
      realHourlyWage: null,
      totalWorkRelatedHours: 0,
      totalWorkRelatedExpenses: 0,
      adjustedNetIncome: 2500,
      breakdown: {
        paidWorkHours: 0,
        overheadHours: 0,
        totalHours: 0,
        directHoursByType: {
          commuteHours: 0,
          prepHours: 0,
          recoveryHours: 0,
          adminHours: 0,
          overtimeHours: 0,
          otherWorkHours: 0,
        },
        expensesByType: {
          directWorkExpenses: 0,
          commuteExpenses: 0,
          foodExpenses: 0,
          clothingExpenses: 0,
          otherWorkExpenses: 0,
        },
      },
    });
  });

  it('returns a readable validation error for malformed input', () => {
    expect(JSON.parse(realHourlyWageToy('not json'))).toEqual({
      error: 'Invalid real hourly wage input: root payload must be an object',
    });
    expect(
      JSON.parse(
        realHourlyWageToy(
          JSON.stringify({
            period: {
              paidWorkHours: -1,
              grossIncome: 5000,
              netIncome: 3200,
            },
            overhead: {},
          })
        )
      )
    ).toEqual({
      error:
        'Invalid real hourly wage input: period.paidWorkHours must be a non-negative finite number',
    });
  });

  it('normalizes optional overhead fields to zero', () => {
    const normalized = realHourlyWageToyTestOnly.normalizeRealHourlyWageInput({
      period: {
        paidWorkHours: 80,
        grossIncome: 2000,
        netIncome: 1500,
      },
      overhead: {
        commuteHours: 3,
        directWorkExpenses: 9,
      },
    });

    expect(normalized.error).toBeUndefined();
    expect(normalized.value).toEqual({
      period: {
        paidWorkHours: 80,
        grossIncome: 2000,
        netIncome: 1500,
      },
      overhead: {
        commuteHours: 3,
        prepHours: 0,
        recoveryHours: 0,
        adminHours: 0,
        overtimeHours: 0,
        otherWorkHours: 0,
        directWorkExpenses: 9,
        commuteExpenses: 0,
        foodExpenses: 0,
        clothingExpenses: 0,
        otherWorkExpenses: 0,
      },
    });
  });
});
