import * as browserCore from '../browser-core.js';
import {
  createManagedFormShellState,
  runFormHandler,
  syncHiddenInput,
  wireLabelledField,
} from './createDendriteHandler.js';
import { isNonNullObject, numberOrZero } from '../../commonCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/**
 * @typedef {{
 *   period: {
 *     paidWorkHours: number,
 *     grossIncome: number,
 *     netIncome: number,
 *   },
 *   overhead: {
 *     commuteHours: number,
 *     prepHours: number,
 *     recoveryHours: number,
 *     adminHours: number,
 *     overtimeHours: number,
 *     otherWorkHours: number,
 *     directWorkExpenses: number,
 *     commuteExpenses: number,
 *     foodExpenses: number,
 *     clothingExpenses: number,
 *     otherWorkExpenses: number,
 *   },
  }} RealHourlyWageFormData */

const FORM_CLASS = 'real-hourly-wage-form';
const GROUP_CLASS = 'real-hourly-wage-form-group';
const GROUP_TITLE_CLASS = 'real-hourly-wage-form-group-title';

const FIELD_GROUPS = [
  {
    title: 'Period',
    fields: [
      {
        path: ['period', 'paidWorkHours'],
        labelText: 'Paid work hours',
        placeholder: '160',
      },
      {
        path: ['period', 'grossIncome'],
        labelText: 'Gross income',
        placeholder: '5000',
      },
      {
        path: ['period', 'netIncome'],
        labelText: 'Net income',
        placeholder: '3200',
      },
    ],
  },
  {
    title: 'Overhead hours',
    fields: [
      {
        path: ['overhead', 'commuteHours'],
        labelText: 'Commute hours',
        placeholder: '20',
      },
      {
        path: ['overhead', 'prepHours'],
        labelText: 'Prep hours',
        placeholder: '5',
      },
      {
        path: ['overhead', 'recoveryHours'],
        labelText: 'Recovery hours',
        placeholder: '10',
      },
      {
        path: ['overhead', 'adminHours'],
        labelText: 'Admin hours',
        placeholder: '4',
      },
      {
        path: ['overhead', 'overtimeHours'],
        labelText: 'Overtime hours',
        placeholder: '2',
      },
      {
        path: ['overhead', 'otherWorkHours'],
        labelText: 'Other work hours',
        placeholder: '1',
      },
    ],
  },
  {
    title: 'Overhead expenses',
    fields: [
      {
        path: ['overhead', 'directWorkExpenses'],
        labelText: 'Direct work expenses',
        placeholder: '120',
      },
      {
        path: ['overhead', 'commuteExpenses'],
        labelText: 'Commute expenses',
        placeholder: '40',
      },
      {
        path: ['overhead', 'foodExpenses'],
        labelText: 'Food expenses',
        placeholder: '15',
      },
      {
        path: ['overhead', 'clothingExpenses'],
        labelText: 'Clothing expenses',
        placeholder: '25',
      },
      {
        path: ['overhead', 'otherWorkExpenses'],
        labelText: 'Other work expenses',
        placeholder: '10',
      },
    ],
  },
];

/**
 * Create a default form payload.
 * @returns {RealHourlyWageFormData} Default data model.
 */
function createDefaultFormData() {
  return {
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
  };
}

/**
 * Check whether a candidate is a plain object.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} True when the value is object-like.
 */
function isObjectLike(value) {
  return isNonNullObject(value);
}

/**
 * Read a numeric field from a nested object.
 * @param {Record<string, unknown>} section Data section.
 * @param {string} key Field name.
 * @returns {number} Normalized field value.
 */
function readNumber(section, key) {
  return numberOrZero(Number(section[key]));
}

/**
 * Read a section object or return an empty object.
 * @param {Record<string, unknown>} data Source payload.
 * @param {string} key Section name.
 * @returns {Record<string, unknown>} Section object or empty object.
 */
function readSection(data, key) {
  const candidate = data[key];
  if (isObjectLike(candidate)) {
    return candidate;
  }
  return {};
}

/**
 * Normalize arbitrary JSON into the form payload structure.
 * @param {unknown} candidate Parsed input payload.
 * @returns {RealHourlyWageFormData} Normalized form data.
 */
function normalizeFormData(candidate) {
  if (!isObjectLike(candidate)) {
    return createDefaultFormData();
  }

  const data = candidate;
  const period = readSection(data, 'period');
  const overhead = readSection(data, 'overhead');
  const normalized = createDefaultFormData();

  normalized.period.paidWorkHours = readNumber(period, 'paidWorkHours');
  normalized.period.grossIncome = readNumber(period, 'grossIncome');
  normalized.period.netIncome = readNumber(period, 'netIncome');

  normalized.overhead.commuteHours = readNumber(overhead, 'commuteHours');
  normalized.overhead.prepHours = readNumber(overhead, 'prepHours');
  normalized.overhead.recoveryHours = readNumber(overhead, 'recoveryHours');
  normalized.overhead.adminHours = readNumber(overhead, 'adminHours');
  normalized.overhead.overtimeHours = readNumber(overhead, 'overtimeHours');
  normalized.overhead.otherWorkHours = readNumber(overhead, 'otherWorkHours');
  normalized.overhead.directWorkExpenses = readNumber(
    overhead,
    'directWorkExpenses'
  );
  normalized.overhead.commuteExpenses = readNumber(overhead, 'commuteExpenses');
  normalized.overhead.foodExpenses = readNumber(overhead, 'foodExpenses');
  normalized.overhead.clothingExpenses = readNumber(
    overhead,
    'clothingExpenses'
  );
  normalized.overhead.otherWorkExpenses = readNumber(
    overhead,
    'otherWorkExpenses'
  );

  return normalized;
}

/**
 * Read and normalize the persisted payload from the hidden input.
 * @param {HTMLInputElement} textInput Hidden input element.
 * @returns {RealHourlyWageFormData} Normalized data model.
 */
function parseFormData(textInput) {
  const raw = browserCore.getInputValue(textInput) || '{}';
  const parsed = browserCore.parseJsonOrDefault(raw, {});
  return normalizeFormData(parsed);
}

/**
 * Read a nested numeric field from the data model.
 * @param {RealHourlyWageFormData} data Data model.
 * @param {[keyof RealHourlyWageFormData, string]} path Section and field path.
 * @returns {number} Stored number.
 */
function getFieldValue(data, path) {
  const section = data[path[0]];
  return numberOrZero(Number(section[path[1]]));
}

/**
 * Write a nested numeric field into the data model.
 * @param {RealHourlyWageFormData} data Data model.
 * @param {[keyof RealHourlyWageFormData, string]} path Section and field path.
 * @param {unknown} rawValue Input value.
 * @returns {void}
 */
function setFieldValue(data, path, rawValue) {
  const section = data[path[0]];
  section[path[1]] = numberOrZero(Number(rawValue));
}

/**
 * Create a section wrapper for a group of fields.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {string} title Section title.
 * @returns {HTMLElement} Section element.
 */
function createGroupSection(dom, title) {
  const section = dom.createElement('section');
  dom.setClassName(section, GROUP_CLASS);

  const heading = dom.createElement('h4');
  dom.setClassName(heading, GROUP_TITLE_CLASS);
  dom.setTextContent(heading, title);
  dom.appendChild(section, heading);
  return section;
}

/**
 * Wire a numeric field into the form.
 * @param {{
 *   dom: DOMHelpers,
 *   section: HTMLElement,
 *   data: RealHourlyWageFormData,
 *   path: [keyof RealHourlyWageFormData, string],
 *   labelText: string,
 *   placeholder: string,
 *   textInput: HTMLInputElement,
 *   disposers: Array<() => void>,
 * }} options Field wiring dependencies.
 * @returns {void}
 */
function buildNumericField(options) {
  const {
    dom,
    section,
    data,
    path,
    labelText,
    placeholder,
    textInput,
    disposers,
  } = options;
  const input = dom.createElement('input');
  dom.setType(input, 'number');
  dom.setPlaceholder(input, placeholder);
  dom.setValue(input, String(getFieldValue(data, path)));

  const handleInput = () => {
    setFieldValue(data, path, dom.getValue(input));
    syncHiddenInput(dom, textInput, data);
  };

  wireLabelledField({
    dom,
    form: section,
    input,
    labelText,
    handler: handleInput,
    disposers,
  });
}

/**
 * Build and append a group section into the form.
 * @param {{
 *   dom: DOMHelpers,
 *   form: HTMLElement,
 *   data: RealHourlyWageFormData,
 *   textInput: HTMLInputElement,
 *   disposers: Array<() => void>,
 *   title: string,
 *   fields: Array<{
 *     path: [keyof RealHourlyWageFormData, string],
 *     labelText: string,
 *     placeholder: string,
 *   }>,
 * }} options Group rendering dependencies.
 * @returns {void}
 */
function buildGroupSection(options) {
  const { dom, form, data, textInput, disposers, title, fields } = options;
  const section = createGroupSection(dom, title);

  fields.forEach(field => {
    buildNumericField({
      dom,
      section,
      data,
      textInput,
      disposers,
      ...field,
    });
  });

  dom.appendChild(form, section);
}

/**
 * Build the editable REAL1 form.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }} options Form wiring dependencies.
 * @returns {HTMLElement} Created form element.
 */
function buildForm({ dom, container, textInput }) {
  const data = parseFormData(textInput);
  const { form, disposers } = createManagedFormShellState({
    dom,
    container,
    textInput,
  });

  dom.setClassName(form, `${form.className} ${FORM_CLASS}`.trim());
  FIELD_GROUPS.forEach(group =>
    buildGroupSection({
      dom,
      form,
      data,
      textInput,
      disposers,
      ...group,
    })
  );

  syncHiddenInput(dom, textInput, data);
  return form;
}

/**
 * Switch the UI to the REAL1 structured wage input method.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {HTMLElement} container Container element.
 * @param {HTMLInputElement} textInput Hidden input element.
 * @returns {void}
 */
export function realHourlyWageHandler(dom, container, textInput) {
  runFormHandler({ dom, container, textInput, buildForm });
}

export const realHourlyWageHandlerTestOnly = {
  normalizeFormData,
};
