import { describe, expect, test } from '@jest/globals';
import {
  createRealHourlyWageReportElement,
  realHourlyWagePresenterTestOnly,
} from '../../src/core/browser/presenters/realHourlyWage.js';

/**
 * Create a minimal DOM mock for presenter tests.
 * @returns {{ createElement: (tag: string) => { tag: string, className: string, textContent: string, children: unknown[], listeners: Record<string, unknown> }, setClassName: (node: { className: string }, className: string) => void, setTextContent: (node: { textContent: string }, text: string) => void, appendChild: (parent: { children: unknown[] }, child: unknown) => void, removeAllChildren: (node: { children: unknown[] }) => void }} DOM mock.
 */
function createMockDom() {
  return {
    createElement: tag => ({
      tag,
      className: '',
      textContent: '',
      children: [],
      listeners: {},
    }),
    setClassName: (node, className) => {
      node.className = className;
    },
    setTextContent: (node, text) => {
      node.textContent = text;
    },
    appendChild: (parent, child) => {
      parent.children.push(child);
    },
    removeAllChildren: node => {
      node.children.length = 0;
    },
  };
}

describe('createRealHourlyWageReportElement', () => {
  test('returns a fallback pre element when JSON is invalid', () => {
    const dom = createMockDom();
    const input = 'not json';

    const result = createRealHourlyWageReportElement(input, dom);

    expect(result.tag).toBe('pre');
    expect(result.textContent).toBe(input);
  });

  test('renders the wage summary and breakdown tables', () => {
    const dom = createMockDom();
    const payload = {
      nominalHourlyWage: 31.25,
      realHourlyWage: 14.8,
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
        },
        expensesByType: {
          directWorkExpenses: 120,
          commuteExpenses: 40,
        },
      },
    };

    const element = createRealHourlyWageReportElement(
      JSON.stringify(payload),
      dom
    );

    expect(element.className).toBe('real-hourly-wage-output');
    const [header, summary, hours, expenses] = element.children;
    expect(header.className).toBe('real-hourly-wage-header');
    expect(header.children[0].textContent).toBe('Real Hourly Wage');
    expect(summary.children[0].textContent).toBe('Summary');
    expect(summary.children[1].children[0].children[1].textContent).toBe(
      '31.25'
    );
    expect(summary.children[1].children[1].children[1].textContent).toBe(
      '14.80'
    );
    expect(hours.children[0].textContent).toBe('Hours breakdown');
    expect(hours.children[1].children[0].children[0].textContent).toBe(
      'Paid work hours'
    );
    expect(hours.children[1].children[3].children[0].textContent).toBe(
      'Commute Hours'
    );
    expect(expenses.children[0].textContent).toBe('Expense breakdown');
    expect(expenses.children[1].children[0].children[0].textContent).toBe(
      'Direct Work Expenses'
    );
  });
});

describe('realHourlyWagePresenterTestOnly', () => {
  test('formats numbers and labels defensively', () => {
    expect(realHourlyWagePresenterTestOnly.formatDisplayValue(null)).toBe('—');
    expect(realHourlyWagePresenterTestOnly.formatDisplayValue(undefined)).toBe(
      '—'
    );
    expect(realHourlyWagePresenterTestOnly.formatDisplayValue('')).toBe('—');
    expect(realHourlyWagePresenterTestOnly.formatDisplayValue(14.8)).toBe(
      '14.80'
    );
    expect(realHourlyWagePresenterTestOnly.formatNumber(Infinity)).toBe('—');
    expect(realHourlyWagePresenterTestOnly.humanizeKey('grossIncome')).toBe(
      'Gross Income'
    );
  });

  test('renders an empty table row when there are no values', () => {
    const dom = createMockDom();

    const table = realHourlyWagePresenterTestOnly.createTable(dom, []);

    expect(table.children[0].children[0].textContent).toBe('None');
    expect(table.children[0].children[1].textContent).toBe('—');
  });

  test('falls back cleanly when breakdown data is missing', () => {
    expect(realHourlyWagePresenterTestOnly.getHourRows({})).toEqual([
      ['Paid work hours', undefined],
      ['Overhead hours', undefined],
      ['Total hours', undefined],
    ]);
    expect(realHourlyWagePresenterTestOnly.getExpenseRows({})).toEqual([]);
  });
});
