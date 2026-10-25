import { readFileSync } from 'node:fs';
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { startIndustrialHeatPumpReadinessPage } from '../../src/browser/industrialHeatPump/page.js';
import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../fixtures/industrialHeatPumpReadiness.js';
import { createIndustrialHeatPumpScenarioExport } from '../../src/core/browser/industrialHeatPump/scenarios.js';
import { calculateIndustrialHeatPumpReadiness } from '../../src/browser/industrialHeatPumpReadiness.js';

const PAGE = readFileSync(
  new URL(
    '../../src/content/pages/industrial-heat-pump-readiness/index.html',
    import.meta.url
  ),
  'utf8'
);
const ENTRY = readFileSync(
  new URL(
    '../../src/content/pages/industrial-heat-pump-readiness/app.js',
    import.meta.url
  ),
  'utf8'
);
const CONTROLLER = readFileSync(
  new URL('../../src/browser/industrialHeatPump/page.js', import.meta.url),
  'utf8'
);

test('publishes an editable standalone process-heat screening page', () => {
  expect(PAGE).toContain('id="assumptions-form"');
  expect(PAGE).toContain('id="results"');
  expect(PAGE).toContain('name="heatPumpCop"');
  expect(PAGE).toContain('name="availableElectricalPowerKw"');
  expect(PAGE).toContain('Vendor discussion brief');
  expect(PAGE).toContain('Export scenario JSON');
  expect(PAGE).toContain('not equipment sizing');
  expect(ENTRY).toContain("from '/browser/industrialHeatPump/page.js'");
});

test('shows the base comparison and recalculates when an assumption changes', () => {
  const dom = createPage();
  const { document, Event } = dom.window;

  expect(document.querySelector('#results').hidden).toBe(false);
  expect(document.querySelector('#fuel-input').textContent).toContain(
    '564.705'
  );
  expect(document.querySelector('#electricity-input').textContent).toContain(
    '240.000'
  );
  expect(document.querySelector('#simple-payback').textContent).toContain(
    'years'
  );
  expect(document.querySelectorAll('#missing-measurements li')).toHaveLength(5);

  const cop = document.querySelector('[name="heatPumpCop"]');
  cop.value = '3';
  cop.dispatchEvent(new Event('input', { bubbles: true }));

  expect(document.querySelector('#electricity-input').textContent).toContain(
    '160.000'
  );
  expect(document.querySelector('#page-status').textContent).toContain(
    'updated'
  );
  expect(document.querySelector('#scenario-select').value).toBe('custom');
});

test('scenario presets and reset update the visible assumptions and result', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const selector = document.querySelector('#scenario-select');

  selector.value = 'optimistic';
  selector.dispatchEvent(new Event('change', { bubbles: true }));
  expect(document.querySelector('[name="heatPumpCop"]').value).toBe('2.8');
  expect(document.querySelector('[name="heatPumpMaxTemperatureC"]').value).toBe(
    '160'
  );
  expect(document.querySelector('#page-status').textContent).toContain(
    'Illustrative sensitivity'
  );

  document.querySelector('#reset-button').click();
  expect(selector.value).toBe('base');
  expect(document.querySelector('[name="heatPumpCop"]').value).toBe(
    String(INDUSTRIAL_HEAT_PUMP_FIXTURE.heatPumpCop)
  );
});

test('ignores an unavailable preset without changing the current result', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const status = document.querySelector('#page-status').textContent;
  const selector = document.querySelector('#scenario-select');

  selector.value = 'unknown';
  selector.dispatchEvent(new Event('change', { bubbles: true }));

  expect(document.querySelector('#page-status').textContent).toBe(status);
  expect(document.querySelector('#results').hidden).toBe(false);
});

test('invalid values show field errors and hide stale results', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const cop = document.querySelector('[name="heatPumpCop"]');
  cop.value = '0';
  document.querySelector('[name="requiredSupplyTemperatureC"]').value = '-1';
  cop.dispatchEvent(new Event('input', { bubbles: true }));

  expect(cop.getAttribute('aria-invalid')).toBe('true');
  expect(
    document.querySelector('[data-error-for="heatPumpCop"]').textContent
  ).toContain('minimum');
  expect(document.querySelector('#validation-summary').hidden).toBe(false);
  expect(document.querySelector('#validation-summary').textContent).toContain(
    '2 assumptions'
  );
  expect(document.querySelector('#overall-status').textContent).toContain(
    'Results are hidden'
  );
  expect(document.querySelector('.comparison-grid').hidden).toBe(true);
  expect(document.querySelector('#export-button').disabled).toBe(true);

  document.querySelector('#reset-button').click();
  expect(document.querySelector('#validation-summary').hidden).toBe(true);
  expect(document.querySelector('.comparison-grid').hidden).toBe(false);
});

test('reports no-payback honestly when electricity costs remove savings', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const price = document.querySelector('[name="electricityPricePerKwh"]');
  price.value = '0.5';
  price.dispatchEvent(new Event('input', { bubbles: true }));

  expect(document.querySelector('#economics-status').textContent).toContain(
    'No positive'
  );
  expect(document.querySelector('#simple-payback').textContent).toContain(
    'Not applicable'
  );
  const installedCost = document.querySelector('[name="installedCost"]');
  installedCost.value = '1000000';
  installedCost.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('#minimum-cop').textContent).toContain(
    'Not achievable'
  );
  expect(document.querySelector('#overall-status').textContent).toContain(
    'no positive operating savings'
  );
});

test('separates temperature and electrical-capacity constraints', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  document.querySelector('[name="heatPumpMaxTemperatureC"]').value = '100';
  const power = document.querySelector('[name="availableElectricalPowerKw"]');
  power.value = '10';
  power.dispatchEvent(new Event('input', { bubbles: true }));

  expect(document.querySelector('#temperature-status').textContent).toContain(
    'Above'
  );
  expect(document.querySelector('#power-status').textContent).toContain(
    'short'
  );
  expect(document.querySelector('#overall-status').textContent).toContain(
    'temperature exceeds'
  );
  expect(document.querySelector('#overall-status').textContent).toContain(
    'electrical capacity'
  );
});

test('exports the current assumptions and print brief through injected effects', () => {
  const downloaded = [];
  const printPage = jest.fn();
  const dom = createPage({
    downloadJson: (...args) => downloaded.push(args),
    printPage,
  });
  const { document, Event } = dom.window;

  document.querySelector('#export-button').click();
  document.querySelector('#print-button').click();
  const cop = document.querySelector('[name="heatPumpCop"]');
  cop.value = '3';
  cop.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#export-button').click();

  expect(downloaded).toHaveLength(2);
  expect(downloaded[0][0]).toMatchObject({
    schemaVersion: 1,
    assumptions: INDUSTRIAL_HEAT_PUMP_FIXTURE,
  });
  expect(downloaded[0][0].disclosure).toContain('Hypothetical');
  const restored = JSON.parse(JSON.stringify(downloaded[0][0]));
  expect(restored).not.toHaveProperty('industryGraphReferences');
  expect(
    calculateIndustrialHeatPumpReadiness(restored.assumptions).comparison
  ).toEqual(restored.result);
  expect(downloaded[0][1]).toBe('industrial-heat-pump-screening.json');
  expect(downloaded[1][0].scenarioName).toBe('Custom assumptions');
  expect(document.querySelector('#export-status').textContent).toContain(
    'Exported'
  );
  expect(printPage).toHaveBeenCalledTimes(1);
});

test('portable exports reproduce the result and preserve optional industry graph links', () => {
  const assumptions = { ...INDUSTRIAL_HEAT_PUMP_FIXTURE, heatPumpCop: 3 };
  const result = calculateIndustrialHeatPumpReadiness(assumptions).comparison;
  const industryGraphReferences = {
    sector: 'test:food-processing',
    process: 'test:process-heat',
    inputs: ['test:electricity', 'test:fuel'],
    outputs: ['test:useful-heat'],
  };
  const exported = createIndustrialHeatPumpScenarioExport({
    scenarioName: 'Linked illustrative process',
    assumptions,
    result,
    industryGraphReferences,
  });
  const restored = JSON.parse(JSON.stringify(exported));
  expect(restored.industryGraphReferences).toEqual(industryGraphReferences);
  expect(calculateIndustrialHeatPumpReadiness(restored.assumptions)).toEqual({
    valid: true,
    comparison: restored.result,
  });
});

test('finite inputs that overflow the calculation show a range error without stale results', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const cop = document.querySelector('[name="heatPumpCop"]');
  cop.value = String(Number.MIN_VALUE);
  cop.dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('#validation-summary').textContent).toContain(
    'numeric range'
  );
  expect(document.querySelector('.comparison-grid').hidden).toBe(true);
  expect(document.querySelector('.brief-card').hidden).toBe(true);
  expect(document.querySelector('#export-button').disabled).toBe(true);
  document.querySelector('#reset-button').click();
  expect(document.querySelector('.comparison-grid').hidden).toBe(false);
});

test('the presenter stays client-only and disposes its listeners', () => {
  const dom = new JSDOM(PAGE);
  const dispose = startIndustrialHeatPumpReadinessPage({
    documentObj: dom.window.document,
    windowObj: dom.window,
  });
  const { document, Event } = dom.window;
  const submit = new Event('submit', { bubbles: true, cancelable: true });
  document.querySelector('#assumptions-form').dispatchEvent(submit);
  expect(submit.defaultPrevented).toBe(true);
  const electricityInput = document.querySelector('#electricity-input');
  const before = electricityInput.textContent;
  dispose();
  document.querySelector('[name="heatPumpCop"]').value = '3';
  document
    .querySelector('[name="heatPumpCop"]')
    .dispatchEvent(new Event('input', { bubbles: true }));

  expect(electricityInput.textContent).toBe(before);
  expect(CONTROLLER).not.toMatch(/\bfetch\s*\(/);
  expect(CONTROLLER).not.toMatch(/localStorage|sessionStorage/);
});

test('returns a safe disposer when a required page control is absent', () => {
  for (const id of [
    'assumptions-form',
    'results',
    'scenario-select',
    'reset-button',
    'export-button',
    'print-button',
    'page-status',
    'validation-summary',
  ]) {
    const dom = new JSDOM(PAGE);
    dom.window.document.querySelector(`#${id}`).remove();
    const dispose = startIndustrialHeatPumpReadinessPage({
      documentObj: dom.window.document,
      windowObj: dom.window,
    });

    expect(() => dispose()).not.toThrow();
  }
});

test('handles optional result and brief nodes being absent', () => {
  const dom = new JSDOM(PAGE);
  const { document, window } = dom.window;
  for (const selector of [
    '#overall-status',
    '#temperature-status',
    '#temperature-detail',
    '#power-status',
    '#power-detail',
    '#economics-status',
    '#economics-detail',
    '#fuel-input',
    '#electricity-input',
    '#fuel-cost',
    '#electricity-cost',
    '#maintenance-cost',
    '#annual-savings',
    '#simple-payback',
    '#minimum-cop',
    '#maximum-installed-cost',
    '#brief-summary',
    '#missing-measurements',
    '#commissioning-questions',
    '#export-status',
    '.feasibility-grid',
    '.comparison-grid',
  ])
    document.querySelector(selector)?.remove();

  const dispose = startIndustrialHeatPumpReadinessPage({
    documentObj: document,
    windowObj: window,
    downloadJson: jest.fn(),
    printPage: jest.fn(),
  });
  expect(() => document.querySelector('#export-button').click()).not.toThrow();
  expect(() => dispose()).not.toThrow();
});

test('shows validation when a form input or its error node is absent', () => {
  const dom = new JSDOM(PAGE);
  const { document, window } = dom.window;
  document.querySelector('[name="heatPumpCop"]').remove();
  document.querySelector('[data-error-for="heatPumpCop"]').remove();

  const dispose = startIndustrialHeatPumpReadinessPage({
    documentObj: document,
    windowObj: window,
  });

  expect(document.querySelector('#validation-summary').hidden).toBe(false);
  expect(document.querySelector('#results').hidden).toBe(false);
  expect(() => dispose()).not.toThrow();
});

test('handles missing result sections during a later validation update', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  document.querySelector('.brief-card').remove();
  const cop = document.querySelector('[name="heatPumpCop"]');
  cop.value = '0';

  expect(() =>
    cop.dispatchEvent(new Event('input', { bubbles: true }))
  ).not.toThrow();
});

test('keeps export blocked when assumptions are invalid', () => {
  const dom = createPage();
  const { document, Event, MouseEvent } = dom.window;
  const cop = document.querySelector('[name="heatPumpCop"]');
  cop.value = '0';
  cop.dispatchEvent(new Event('input', { bubbles: true }));

  document
    .querySelector('#export-button')
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));

  expect(document.querySelector('#page-status').textContent).toContain(
    'Correct the scenario before exporting'
  );
});

/**
 * @param {Record<string,unknown>} [dependencies] Optional page effect adapters.
 * @returns {JSDOM} Wired page for DOM-level interaction tests.
 */
function createPage(dependencies = {}) {
  const dom = new JSDOM(PAGE, {
    url: 'https://example.test/industrial-heat-pump-readiness/',
  });
  dom.window.URL.createObjectURL = jest.fn(() => 'blob:scenario');
  dom.window.URL.revokeObjectURL = jest.fn();
  dom.window.print = jest.fn();
  dom.window.HTMLAnchorElement.prototype.click = jest.fn();
  startIndustrialHeatPumpReadinessPage({
    documentObj: dom.window.document,
    windowObj: dom.window,
    ...dependencies,
  });
  return dom;
}
