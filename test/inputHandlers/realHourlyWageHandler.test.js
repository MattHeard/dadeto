import { describe, expect, jest, test } from '@jest/globals';
import {
  realHourlyWageHandler,
  realHourlyWageHandlerTestOnly,
} from '../../src/core/browser/inputHandlers/realHourlyWage.js';
import { setInputValue } from '../../src/core/browser/browser-core.js';

/**
 * Create a mock DOM facade for the REAL1 input handler.
 * @param {object} overrides Optional mock overrides.
 * @returns {object} Mock DOM helper collection.
 */
function createMockDom(overrides = {}) {
  const createdElements = [];

  const dom = {
    createElement: jest.fn(tag => {
      const element = {
        tag,
        children: [],
        className: '',
        textContent: '',
        value: '',
        placeholder: '',
        type: '',
        listeners: {},
      };
      createdElements.push(element);
      return element;
    }),
    setClassName: jest.fn((element, className) => {
      element.className = className;
    }),
    setType: jest.fn((element, type) => {
      element.type = type;
    }),
    setPlaceholder: jest.fn((element, placeholder) => {
      element.placeholder = placeholder;
    }),
    setValue: jest.fn((element, value) => {
      element.value = value;
    }),
    getValue: jest.fn(element => element.value),
    setTextContent: jest.fn((element, text) => {
      element.textContent = text;
    }),
    appendChild: jest.fn((parent, child) => {
      parent.children.push(child);
    }),
    addEventListener: jest.fn((element, event, handler) => {
      element.listeners[event] = handler;
    }),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(() => null),
    getNextSibling: jest.fn(() => null),
    insertBefore: jest.fn((parent, child) => {
      parent.children.push(child);
    }),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
    removeAllChildren: jest.fn(),
    reveal: jest.fn(),
    enable: jest.fn(),
    getCurrentTarget: jest.fn(event => event.currentTarget),
    getTargetValue: jest.fn(event => event.target.value),
    ...overrides,
  };

  return { dom, createdElements };
}

/**
 * Create a text input facade.
 * @param {string} value Initial input value.
 * @returns {{ value: string, _inputValue: string }} Hidden input mock.
 */
function createTextInput(value = '') {
  return { value, _inputValue: value };
}

describe('realHourlyWageHandler', () => {
  test('creates a structured form and serializes defaults', () => {
    const { dom, createdElements } = createMockDom();
    const container = { children: [] };
    const textInput = createTextInput();

    realHourlyWageHandler(dom, container, textInput);

    expect(dom.hide).toHaveBeenCalledWith(textInput);
    expect(dom.disable).toHaveBeenCalledWith(textInput);
    expect(dom.setClassName).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'div' }),
      'dendrite-form real-hourly-wage-form'
    );
    expect(textInput.value).toBe(
      JSON.stringify({
        period: {
          paidWorkHours: 0,
          grossIncome: 0,
          netIncome: 0,
        },
        overhead: {
          commuteHours: 0,
          prepHours: 0,
          recoveryHours: 0,
          adminHours: 0,
          overtimeHours: 0,
          otherWorkHours: 0,
          directWorkExpenses: 0,
          commuteExpenses: 0,
          foodExpenses: 0,
          clothingExpenses: 0,
          otherWorkExpenses: 0,
        },
      })
    );

    expect(createdElements.some(element => element.tag === 'section')).toBe(
      true
    );
    expect(createdElements.some(element => element.tag === 'input')).toBe(true);
  });

  test('restores stored values into the generated fields', () => {
    const { dom } = createMockDom();
    const container = { children: [] };
    const textInput = createTextInput();
    setInputValue(
      textInput,
      JSON.stringify({
        period: {
          paidWorkHours: 80,
          grossIncome: 2000,
          netIncome: 1500,
        },
        overhead: {
          commuteHours: 3,
          prepHours: 1,
          recoveryHours: 2,
          adminHours: 4,
          overtimeHours: 5,
          otherWorkHours: 6,
          directWorkExpenses: 7,
          commuteExpenses: 8,
          foodExpenses: 9,
          clothingExpenses: 10,
          otherWorkExpenses: 11,
        },
      })
    );

    realHourlyWageHandler(dom, container, textInput);

    const paidWorkHoursInput = dom.createElement.mock.results
      .map(result => result.value)
      .find(element => element.placeholder === '160');
    const otherWorkExpensesInput = dom.createElement.mock.results
      .map(result => result.value)
      .find(element => element.placeholder === '10' && element.value === '11');

    expect(paidWorkHoursInput.value).toBe('80');
    expect(otherWorkExpensesInput.value).toBe('11');
  });

  test('syncs the hidden JSON when a field changes', () => {
    const { dom } = createMockDom();
    const container = { children: [] };
    const textInput = createTextInput();

    realHourlyWageHandler(dom, container, textInput);

    const grossIncomeInput = dom.createElement.mock.results
      .map(result => result.value)
      .find(element => element.placeholder === '5000');

    grossIncomeInput.value = '5001';
    grossIncomeInput.listeners.input();

    expect(textInput.value).toContain('"grossIncome":5001');
    expect(textInput.value).toContain('"paidWorkHours":0');
  });

  test('normalizes non-object payloads to the default form shape', () => {
    expect(
      realHourlyWageHandlerTestOnly.normalizeFormData('not an object')
    ).toEqual({
      period: {
        paidWorkHours: 0,
        grossIncome: 0,
        netIncome: 0,
      },
      overhead: {
        commuteHours: 0,
        prepHours: 0,
        recoveryHours: 0,
        adminHours: 0,
        overtimeHours: 0,
        otherWorkHours: 0,
        directWorkExpenses: 0,
        commuteExpenses: 0,
        foodExpenses: 0,
        clothingExpenses: 0,
        otherWorkExpenses: 0,
      },
    });
  });
});
