import { parseJsonObject } from '../jsonValueHelpers.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {{ key: string, label: string }} ControlLabel */
/** @typedef {{ className?: string, text?: string }} TextNodeOptions */

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
const MAPPING_DESCRIBERS = Object.freeze({
  axis: describeAxisMapping,
  button: describeButtonMapping,
  [FALLBACK_MAPPING_TYPE]: describeOptionalMapping,
});

/**
 * @param {string} inputString Parsed presenter payload string.
 * @returns {Record<string, unknown> | null} Parsed state object or null on invalid JSON.
 */
function parseState(inputString) {
  return parseJsonObject(inputString);
}

/**
 * @param {Record<string, unknown>} mapping Synthetic fallback mapping.
 * @returns {string} Placeholder text for unmapped controls.
 */
function describeOptionalMapping(mapping) {
  return String(mapping.value || 'optional');
}

/**
 * @param {Record<string, unknown>} mapping Stored button mapping for one control.
 * @returns {string} Human-readable button mapping label.
 */
function describeButtonMapping(mapping) {
  return `button ${mapping.index}`;
}

/**
 * @param {Record<string, unknown>} mapping Stored mapping for one control.
 * @returns {string} Human-readable mapping label.
 */
function describeMapping(mapping) {
  return MAPPING_DESCRIBERS[String(mapping.type)](mapping);
}

/**
 * @param {Record<string, unknown>} mapping Stored axis mapping for one control.
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
 * @param {HTMLElement} node Node to decorate.
 * @param {string} className Optional class name.
 * @returns {void}
 */
function applyClassName(node, className) {
  if (!className) {
    return;
  }

  node.className = className;
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
  applyClassName(node, String(options.className));
  applyText(node, String(options.text));
  return node;
}

/**
 * @param {string} key Persisted control key.
 * @param {Record<string, unknown>} parsed Parsed mapping payload.
 * @returns {string} Presenter text for the control value.
 */
function getValueText(key, parsed) {
  return describeMapping(getStoredOrFallbackMapping(key, parsed));
}

/**
 * @param {string} key Persisted control key.
 * @param {Record<string, unknown>} parsed Parsed mapping payload.
 * @returns {Record<string, string>} Synthetic mapping placeholder for skipped or optional controls.
 */
function getUnmappedMapping(key, parsed) {
  return [
    { type: FALLBACK_MAPPING_TYPE, value: 'optional' },
    { type: FALLBACK_MAPPING_TYPE, value: 'skipped' },
  ][Number(parsed.skippedControls?.includes(key))];
}

/**
 * @param {string} key Persisted control key.
 * @param {Record<string, unknown>} parsed Parsed mapping payload.
 * @returns {Record<string, unknown>} Stored mapping or a synthetic fallback mapping.
 */
function getStoredOrFallbackMapping(key, parsed) {
  const mapping = parsed.mappings?.[key];
  return /** @type {Record<string, unknown>} */ (
    [getUnmappedMapping(key, parsed), mapping][Number(mapping !== undefined)]
  );
}

/**
 * @param {Record<string, unknown>} parsed Parsed mapping payload.
 * @returns {string} Summary text shown above the mapping list.
 */
function getSummaryText(parsed) {
  return `${getMappedCount(parsed)} mapped, ${getSkippedCount(parsed)} skipped`;
}

/**
 * @param {Record<string, unknown>} parsed Parsed mapping payload.
 * @returns {number} Number of persisted mappings.
 */
function getMappedCount(parsed) {
  return Object.keys(parsed.mappings || {}).length;
}

/**
 * @param {Record<string, unknown>} parsed Parsed mapping payload.
 * @returns {number} Number of skipped controls.
 */
function getSkippedCount(parsed) {
  return (parsed.skippedControls || []).length;
}

/**
 * @param {string} inputString Raw presenter payload.
 * @param {DOMHelpers} dom DOM helper facade for presenter output.
 * @returns {HTMLElement} Fallback preformatted output for invalid JSON.
 */
function createFallbackElement(inputString, dom) {
  const fallback = dom.createElement('pre');
  dom.setTextContent(fallback, inputString);
  return fallback;
}

/**
 * @param {string} inputString Serialized toy output payload.
 * @param {DOMHelpers} dom DOM helper facade for presenter output.
 * @returns {HTMLElement} Presenter root element.
 */
export function createJoyConMappingElement(inputString, dom) {
  const parsed = parseState(inputString);
  if (!parsed) {
    return createFallbackElement(inputString, dom);
  }

  const root = dom.createElement('div');
  dom.setClassName(root, 'joycon-mapping-output');
  const title = createTextNode(dom, 'h3', {
    className: '',
    text: 'Joy-Con Mapping',
  });
  const summary = createTextNode(dom, 'p', {
    className: '',
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
