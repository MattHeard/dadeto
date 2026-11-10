import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { JSDOM } from 'jsdom';
import { initializeStaticJsonlTables } from '../../../src/core/browser/staticJsonlTable.js';
import {
  loadStaticJsonlOriginal,
  staticJsonlOriginal,
} from './static-jsonl-native-graph.js';
import { serializeCoverageSemantics as serialize } from './coverage-semantics.js';

const observationUrl = new URL(
  './static-jsonl-browser-observations.json',
  import.meta.url
);
const base = {
  columns: ['name', 'count'],
  rows: [
    { index: 0, values: { name: 'B', count: 2 } },
    { index: 1, values: { name: 'A', count: 1 } },
    { index: 2, values: { name: 'B', count: 2 } },
    { index: 3, values: { name: 'B', count: 1 } },
  ],
};

/**
 * Enumerate authored browser payloads independently of implementation branches.
 * @returns {object[]} Native DOM scenarios.
 */
function browserCases() {
  const cases = [{ name: 'normal-priority-ties', payload: base }];
  for (const [index, payload] of [
    null,
    false,
    2,
    '',
    [],
    {},
    { ...base, columns: null },
    { ...base, columns: 'name' },
    { ...base, columns: 1 },
    { ...base, columns: [] },
    { ...base, rows: null },
    { columns: base.columns },
    { ...base, rows: {} },
    { ...base, rows: 'ab' },
    { ...base, rows: [] },
    { ...base, rows: [null] },
    { ...base, rows: [{ index: 0 }] },
    { ...base, rows: [{ index: 0, values: null }] },
    { ...base, columns: ['missing'] },
    { ...base, columns: ['name', 'name'] },
    { ...base, columns: ['__proto__', 'constructor'] },
    {
      columns: ['name'],
      rows: [
        { index: '2', values: { name: {} } },
        { index: '1', values: { name: [] } },
      ],
    },
    {
      columns: ['count'],
      rows: [
        { index: 0, values: { count: 2 } },
        { index: 1, values: { count: '10' } },
        { index: 2, values: { count: null } },
      ],
    },
  ].entries())
    cases.push({ name: `payload-${index}`, payload });
  for (const text of ['', ' ', '{', 'null', '[]'])
    cases.push({ name: `raw-${JSON.stringify(text)}`, payload: base, text });
  for (const missing of [
    'data',
    'tbody',
    'name-indicator',
    'count-indicator',
    'buttons',
  ])
    cases.push({ name: `missing-${missing}`, payload: base, missing });
  for (const write of [
    'create-tr',
    'create-td',
    'append',
    'replaceChildren',
    'indicator',
  ])
    cases.push({ name: `failure-${write}`, payload: base, write });
  cases.push({
    name: 'dataset-change-after-init',
    payload: base,
    changeDataset: true,
  });
  cases.push({
    name: 'dataset-remove-after-init',
    payload: base,
    removeDataset: true,
  });
  cases.push({ name: 'initialize-twice', payload: base, repeat: true });
  cases.push({ name: 'new-initialize', payload: base, construct: true });
  cases.push({ name: 'empty-document', payload: base, empty: true });
  cases.push({ name: 'good-before-broken', payload: base, secondBroken: true });
  return cases;
}

/**
 * Record only portable native error details.
 * @param {unknown} error Observed thrown value.
 * @returns {object} Error identity category and message.
 */
function errorDetails(error) {
  return { type: typeof error, name: error?.name, message: error?.message };
}

/**
 * Build actual DOM tables before tracing production operations.
 * @param {Document} documentObject Native document.
 * @param {object} candidate Scenario data.
 * @returns {HTMLElement} Authored table element.
 */
function makeTable(documentObject, candidate) {
  const table = documentObject.createElement('div');
  table.setAttribute('data-static-jsonl-table', '');
  table.innerHTML =
    '<script data-static-table-data type="application/json"></script><button data-static-table-sort="name"></button><button data-static-table-sort="count"></button><button data-static-table-sort="ghost"></button><span data-static-table-indicator="name">old-name</span><span data-static-table-indicator="count">old-count</span><table><tbody><tr><td>old-body</td></tr></tbody></table>';
  table.querySelector('script').textContent = Object.hasOwn(candidate, 'text')
    ? candidate.text
    : JSON.stringify(candidate.payload);
  const selectors = {
    data: 'script',
    tbody: 'tbody',
    'name-indicator': '[data-static-table-indicator="name"]',
    'count-indicator': '[data-static-table-indicator="count"]',
  };
  if (candidate.missing === 'buttons')
    table.querySelectorAll('button').forEach(button => button.remove());
  else if (selectors[candidate.missing])
    table.querySelector(selectors[candidate.missing]).remove();
  documentObject.body.append(table);
  return table;
}

/**
 * Trace observable DOM effects and allow selected native operations to fail.
 * @param {Window} windowObject Native window.
 * @param {object} candidate Failure controls.
 * @param {unknown[]} trace Ordered platform calls.
 * @returns {void} Installs per-window instrumentation.
 */
function instrument(windowObject, candidate, trace) {
  const documentObject = windowObject.document;
  const create = documentObject.createElement.bind(documentObject);
  documentObject.createElement = (tag, ...options) => {
    trace.push(['create', tag]);
    if (candidate.write === `create-${tag}`)
      throw new RangeError(`create-${tag} sentinel`);
    return create(tag, ...options);
  };
  for (const method of ['append', 'replaceChildren']) {
    const original = windowObject.Element.prototype[method];
    windowObject.Element.prototype[method] = function (...nodes) {
      trace.push([method, this.tagName, nodes.map(node => node.textContent)]);
      if (candidate.write === method)
        throw new RangeError(`${method} sentinel`);
      return original.apply(this, nodes);
    };
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    windowObject.Node.prototype,
    'textContent'
  );
  Object.defineProperty(windowObject.Node.prototype, 'textContent', {
    ...descriptor,
    set(value) {
      trace.push(['text', this.nodeName, value]);
      if (candidate.write === 'indicator' && this.nodeName === 'SPAN')
        throw new RangeError('indicator sentinel');
      return descriptor.set.call(this, value);
    },
  });
}

/**
 * Observe initialization, native event failures, DOM partial writes and reuse.
 * @param {Function} initialize Actual original or current public function.
 * @param {object} candidate Independent scenario.
 * @returns {Promise<object>} Ordered native observations.
 */
async function observeBrowser(initialize, candidate) {
  const dom = new JSDOM('');
  const { window } = dom;
  const documentObject = window.document;
  if (!candidate.empty) makeTable(documentObject, candidate);
  if (candidate.secondBroken) makeTable(documentObject, { text: '{' });
  const trace = [];
  const events = [];
  window.addEventListener('error', event => {
    events.push(errorDetails(event.error));
    event.preventDefault();
  });
  instrument(window, candidate, trace);
  const snapshots = [];
  const snapshot = (phase, error) =>
    snapshots.push({
      phase,
      error,
      html: documentObject.body.innerHTML,
      trace: trace.splice(0),
      events: events.splice(0),
    });
  const initializeOnce = () => {
    try {
      if (candidate.construct) new initialize(documentObject);
      else initialize(documentObject);
      snapshot('initialize');
    } catch (error) {
      snapshot('initialize', errorDetails(error));
    }
  };
  try {
    initializeOnce();
    if (candidate.repeat) initializeOnce();
    const button = documentObject.querySelector(
      '[data-static-table-sort="name"]'
    );
    if (candidate.changeDataset && button)
      button.dataset.staticTableSort = 'count';
    if (candidate.removeDataset && button)
      delete button.dataset.staticTableSort;
    for (const column of ['name', 'count', 'count', 'ghost', 'name']) {
      documentObject
        .querySelector(`[data-static-table-sort="${column}"]`)
        ?.click();
      snapshot(`click-${column}`);
    }
    return { name: candidate.name, snapshots };
  } finally {
    window.close();
    await setImmediate();
  }
}

/**
 * Compare the complete native original/current scenario corpus before pinning.
 * @returns {Promise<void>} Throws on source or behavior drift.
 */
async function main() {
  const original = await loadStaticJsonlOriginal(
    'src/core/browser/staticJsonlTable.js'
  );
  const observations = [];
  for (const candidate of browserCases()) {
    const legacy = await observeBrowser(
      original.initializeStaticJsonlTables,
      candidate
    );
    const current = await observeBrowser(
      initializeStaticJsonlTables,
      candidate
    );
    assert.equal(serialize(current), serialize(legacy), candidate.name);
    observations.push(legacy);
  }
  const receipt = {
    revision: staticJsonlOriginal.revision,
    cases: observations.length,
    snapshots: observations.reduce(
      (count, item) => count + item.snapshots.length,
      0
    ),
    sha256: createHash('sha256').update(serialize(observations)).digest('hex'),
  };
  if (process.argv.includes('--write-legacy'))
    writeFileSync(observationUrl, `${JSON.stringify(receipt, null, 2)}\n`);
  else
    assert.deepEqual(receipt, JSON.parse(readFileSync(observationUrl, 'utf8')));
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
}
await main();
