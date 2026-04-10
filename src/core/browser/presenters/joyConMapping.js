import {
  createPresenterRoot,
  createParsedJsonPresenter,
} from './browserPresentersCore.js';
import { arrayOrEmpty } from '../../commonCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ key: string, label: string }} ControlLabel */
/** @typedef {{ className?: string, text?: string }} TextNodeOptions */
/**
 * @typedef JoyConMappingRecord
 * @property {string} [type] Mapping mode (`button`, `axis`, or fallback).
 * @property {string} [axis] Axis identifier for axis mappings.
 * @property {string} [direction] Direction descriptor for axis mappings.
 * @property {number} [index] Button index for button mappings.
 * @property {string} [value] Fallback display value when unmapped.
 */
/** @typedef {Record<string, JoyConMappingRecord>} JoyConMappingRecords */
/**
 * @typedef JoyConMappingState
 * @property {JoyConMappingRecords} [mappings] Control mapping entries keyed by control id.
 * @property {string[]} [skippedControls] Controls the user explicitly skipped.
 */

const CONTROL_LABELS = /** @type {ControlLabel[]} */ ([
  { key: 'l', label: 'L' },
  { key: 'zl', label: 'ZL' },
  { key: 'minus', label: 'Minus' },
  { key: 'capture', label: 'Capture' },
  { key: 'stick_press', label: 'Stick Press' },
  { key: 'dpad_up', label: 'D-Pad Up' },
  { key: 'dpad_down', label: 'D-Pad Down' },
  { key: 'dpad_left', label: 'D-Pad Left' },
  { key: 'dpad_right', label: 'D-Pad Right' },
  { key: 'stick_left', label: 'Stick Left' },
  { key: 'stick_right', label: 'Stick Right' },
  { key: 'stick_up', label: 'Stick Up' },
  { key: 'stick_down', label: 'Stick Down' },
]);
const FALLBACK_MAPPING_TYPE = 'fallback';
/**
 * @type {Record<string, (mapping: JoyConMappingRecord) => string>}
 */
const MAPPING_DESCRIBERS = Object.freeze({
  axis: describeAxisMapping,
  button: describeButtonMapping,
  [FALLBACK_MAPPING_TYPE]: describeOptionalMapping,
});

/**
 * @param {JoyConMappingRecord} mapping Synthetic fallback mapping.
 * @returns {string} Placeholder text for unmapped controls.
 */
function describeOptionalMapping(mapping) {
  return String(mapping.value || 'optional');
}

/**
 * @param {JoyConMappingRecord} mapping Stored button mapping for one control.
 * @returns {string} Human-readable button mapping label.
 */
function describeButtonMapping(mapping) {
  return `button ${mapping.index}`;
}

/**
 * @param {JoyConMappingRecord} mapping Stored mapping for one control.
 * @returns {string} Human-readable mapping label.
 */
function describeMapping(mapping) {
  const descriptor =
    MAPPING_DESCRIBERS[String(mapping.type)] ?? describeOptionalMapping;
  return descriptor(mapping);
}

/**
 * @param {JoyConMappingRecord} mapping Stored axis mapping for one control.
 * @returns {string} Human-readable axis mapping label.
 */
function describeAxisMapping(mapping) {
  return `axis ${mapping.axis} ${getAxisDirectionLabel(mapping.direction)}`;
}

/**
 * @param {unknown} direction Persisted axis direction.
 * @returns {string} Compact axis direction label.
 */
function getAxisDirectionLabel(direction) {
  return ['+', '-'][Number(direction === 'negative')];
}

/**
 * @param {HTMLElement} node Node to populate.
 * @param {string} text Text content to assign.
 * @returns {void}
 */
function applyText(node, text) {
  node.textContent = text;
}

/**
 * @param {DOMHelpers} dom DOM helper facade for presenter output.
 * @param {string} tag Tag name to create.
 * @param {TextNodeOptions} options Class name and text content.
 * @returns {HTMLElement} Created DOM node with optional text.
 */
function createTextNode(dom, tag, options) {
  const node = dom.createElement(tag);
  node.className = String(options.className);
  applyText(node, String(options.text));
  return node;
}

/**
 * @param {string} key Persisted control key.
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {string} Presenter text for the control value.
 */
function getValueText(key, parsed) {
  return describeMapping(getStoredOrFallbackMapping(key, parsed));
}

/**
 * @param {string} key Persisted control key.
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {JoyConMappingRecord} Synthetic mapping placeholder for skipped or optional controls.
 */
function getUnmappedMapping(key, parsed) {
  return createFallbackMapping(isSkippedControl(key, parsed));
}

/**
 * @param {string} key Persisted control key.
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {JoyConMappingRecord} Stored mapping or a synthetic fallback mapping.
 */
function getStoredOrFallbackMapping(key, parsed) {
  const mapping = getStoredMapping(key, parsed);
  return mapping || getUnmappedMapping(key, parsed);
}

/**
 * @param {string} key Persisted control key.
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {JoyConMappingRecord | undefined} Stored mapping when present.
 */
function getStoredMapping(key, parsed) {
  const mappings = parsed.mappings;
  if (!mappings) {
    return undefined;
  }
  return mappings[key];
}

/**
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {string} Summary text shown above the mapping list.
 */
function getSummaryText(parsed) {
  return `${getMappedCount(parsed)} mapped, ${getSkippedCount(parsed)} skipped`;
}

/**
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {number} Number of persisted mappings.
 */
function getMappedCount(parsed) {
  return Object.keys(parsed.mappings || {}).length;
}

/**
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {number} Number of skipped controls.
 */
function getSkippedCount(parsed) {
  return getSkippedControls(parsed).length;
}

/**
 * @param {string} key Persisted control key.
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {boolean} True when the key is listed as skipped.
 */
function isSkippedControl(key, parsed) {
  return getSkippedControls(parsed).includes(key);
}

/**
 * @param {JoyConMappingState} parsed Parsed mapping payload.
 * @returns {string[]} Skipped control keys normalized to an array.
 */
function getSkippedControls(parsed) {
  return arrayOrEmpty(parsed.skippedControls);
}

/**
 * @param {boolean} isSkipped Whether the control should use the skipped placeholder.
 * @returns {JoyConMappingRecord} Synthetic fallback mapping record.
 */
function createFallbackMapping(isSkipped) {
  if (isSkipped) {
    return { type: FALLBACK_MAPPING_TYPE, value: 'skipped' };
  }
  return { type: FALLBACK_MAPPING_TYPE, value: 'optional' };
}

/**
 * Render the parsed Joy-Con mapping state into a presenter root.
 * @param {JoyConMappingState} parsed Parsed presenter payload.
 * @param {DOMHelpers} dom DOM helper facade for presenter output.
 * @returns {HTMLElement} Presenter root element.
 */
function renderJoyConMappingState(parsed, dom) {
  const root = createPresenterRoot(dom, 'joycon-mapping-output');
  const title = createTextNode(dom, 'h3', {
    className: 'joycon-mapping-title',
    text: 'Joy-Con Mapping',
  });
  const summary = createTextNode(dom, 'p', {
    className: 'joycon-mapping-summary',
    text: getSummaryText(parsed),
  });
  const list = dom.createElement('div');
  dom.setClassName(list, 'joycon-mapping-list');

  CONTROL_LABELS.forEach(({ key, label }) => {
    const row = dom.createElement('div');
    dom.setClassName(row, 'joycon-mapping-row');
    const name = createTextNode(dom, 'strong', { className: '', text: label });
    const value = createTextNode(dom, 'span', {
      className: '',
      text: getValueText(key, parsed),
    });
    dom.appendChild(row, name);
    dom.appendChild(row, value);
    dom.appendChild(list, row);
  });

  [title, summary, list].forEach(node => dom.appendChild(root, node));
  return root;
}

/**
 * Render the Joy-Con mapping presenter output.
 * @param {string} inputString Serialized toy output payload.
 * @param {DOMHelpers} dom DOM helper facade for presenter output.
 * @returns {HTMLElement} Presenter root element.
 */
export const createJoyConMappingElement = createParsedJsonPresenter(
  renderJoyConMappingState
);
