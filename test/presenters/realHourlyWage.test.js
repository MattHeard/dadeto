import { describe, expect, jest, test } from '@jest/globals';
import { createParagraphElement } from '../../src/core/browser/presenters/browserPresentersCore.js';
import {
  createRealHourlyWageReportElement,
  realHourlyWagePresenterTestOnly,
} from '../../src/core/browser/presenters/realHourlyWage.js';
import {
  buildWhen,
  normalizePositiveInteger,
  withFallback,
} from '../../src/core/browser/common.js';

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
  test('creates paragraph elements through the shared presenter helper', () => {
    const dom = createMockDom();
    const paragraph = createParagraphElement('Hello', dom);

    expect(paragraph.tag).toBe('p');
    expect(paragraph.textContent).toBe('Hello');
  });

  test('covers a few shared browser common helpers', () => {
    const builder = jest.fn(() => 'built');
    const transform = jest.fn(() => 'transformed');

    expect(withFallback(true, transform, 'fallback')).toBe('transformed');
    expect(withFallback(false, transform, 'fallback')).toBe('fallback');
    expect(buildWhen(true, builder)).toBe('built');
    expect(buildWhen(false, builder)).toBeNull();
    expect(normalizePositiveInteger('2.2', 9)).toBe(2);
    expect(normalizePositiveInteger('0', 9)).toBe(9);
  });

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
    expect(header.tag).toBe('header');
    expect(header.className).toBe('real-hourly-wage-header');
    expect(header.children[0].tag).toBe('h3');
    expect(header.children[1].tag).toBe('p');
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
    expect(realHourlyWagePresenterTestOnly.formatDisplayValue(7)).toBe('7');
    expect(realHourlyWagePresenterTestOnly.formatDisplayValue('plain')).toBe(
      'plain'
    );
    expect(realHourlyWagePresenterTestOnly.formatDisplayValue(NaN)).toBe('—');
    expect(realHourlyWagePresenterTestOnly.humanizeKey('aBCValue')).toBe(
      'A BCValue'
    );
  });

  test('renders an empty table row when there are no values', () => {
    const dom = createMockDom();

    const table = realHourlyWagePresenterTestOnly.createTable(dom, []);

    expect(table.children[0].tag).toBe('tr');
    expect(table.children[0].children[0].textContent).toBe('None');
    expect(table.children[0].children[1].textContent).toBe('—');
  });

  test('renders non-empty rows with semantic cells and formatted values', () => {
    const dom = createMockDom();
    const table = realHourlyWagePresenterTestOnly.createTable(dom, [
      ['Gross income', 12.5],
    ]);

    expect(table.className).toBe('real-hourly-wage-table');
    expect(table.tag).toBe('table');
    expect(table.children).toHaveLength(1);
    expect(table.children[0].className).toBe('real-hourly-wage-row');
    expect(table.children[0].children.map(child => child.tag)).toEqual([
      'th',
      'td',
    ]);
    expect(table.children[0].children[0].textContent).toBe('Gross income');
    expect(table.children[0].children[1].textContent).toBe('12.50');
  });

  test('falls back cleanly when breakdown data is missing', () => {
    expect(realHourlyWagePresenterTestOnly.getHourRows({})).toEqual([
      ['Paid work hours', undefined],
      ['Overhead hours', undefined],
      ['Total hours', undefined],
    ]);
    expect(realHourlyWagePresenterTestOnly.getExpenseRows({})).toEqual([]);
    expect(
      realHourlyWagePresenterTestOnly.getHourRows({
        breakdown: {
          directHoursByType: { commuteHours: 2 },
        },
      })
    ).toEqual([
      ['Paid work hours', undefined],
      ['Overhead hours', undefined],
      ['Total hours', undefined],
      ['Commute Hours', 2],
    ]);
    expect(
      realHourlyWagePresenterTestOnly.getExpenseRows({
        breakdown: { expensesByType: { foodExpenses: 3 } },
      })
    ).toEqual([['Food Expenses', 3]]);
    expect(realHourlyWagePresenterTestOnly.getSummaryRows({
      nominalHourlyWage: 1,
      realHourlyWage: 2,
      adjustedNetIncome: 3,
      totalWorkRelatedHours: 4,
      totalWorkRelatedExpenses: 5,
    })).toEqual([
      ['Nominal hourly wage', 1],
      ['Real hourly wage', 2],
      ['Adjusted net income', 3],
      ['Total work-related hours', 4],
      ['Total work-related expenses', 5],
    ]);
  });
});
