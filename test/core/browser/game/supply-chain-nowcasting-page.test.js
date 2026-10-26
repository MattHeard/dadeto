import { readFileSync } from 'node:fs';
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { startSupplyChainNowcastingPage } from '../../../../src/core/browser/game/supply-chain-nowcasting/page.js';

const PAGE = readFileSync(
  new URL(
    '../../../../src/content/pages/supply-chain-nowcasting/index.html',
    import.meta.url
  ),
  'utf8'
);
const APP = readFileSync(
  new URL(
    '../../../../src/content/pages/supply-chain-nowcasting/app.js',
    import.meta.url
  ),
  'utf8'
);
const MANUAL = readFileSync(
  new URL(
    '../../../../docs/toys/supply-chain-nowcasting/manual.md',
    import.meta.url
  ),
  'utf8'
);

/**
 * @param {Record<string, any>} [options] Test dependencies.
 * @returns {JSDOM} Wired page.
 */
function createPage(options = {}) {
  const dom = new JSDOM(PAGE);
  startSupplyChainNowcastingPage({
    documentObj: dom.window.document,
    ...options,
    dataAdapters: {
      readFileTextFn: options.readFileTextFn,
      downloadPlanFn: options.downloadPlanFn,
    },
  });
  return dom;
}

test('publishes an immediately playable standalone planner with a network diagram and concise safeguards', () => {
  const document = new JSDOM(PAGE).window.document;
  expect(document.querySelector('h1').textContent).toBe('Supply Signals');
  expect(
    document.querySelector('#scenario-status').getAttribute('aria-live')
  ).toBe('polite');
  expect(
    document.querySelector('#warning-lead option[value="0"]')
  ).not.toBeNull();
  expect(
    document.querySelector('#warning-lead option[value="2"]')
  ).not.toBeNull();
  expect(document.querySelector('#disruption-route')).not.toBeNull();
  expect(document.querySelector('#disruption-severity')).not.toBeNull();
  expect(document.querySelector('#disruption-duration').value).toBe('10');
  expect(document.querySelector('#ranking-criterion')).not.toBeNull();
  expect(document.querySelector('#disruption-button').textContent).toContain(
    'one-click disruption'
  );
  expect(document.querySelector('.notice').textContent).toContain(
    'not a live forecast'
  );
  expect(APP).toContain(
    "from '/core/browser/game/supply-chain-nowcasting/page.js'"
  );
});

test('renders the sample, then one-click disruption reveals ranked alternatives and reset restores baseline', () => {
  const dom = new JSDOM(PAGE);
  const dispose = startSupplyChainNowcastingPage({
    documentObj: dom.window.document,
  });
  const { document } = dom.window;
  expect(document.querySelectorAll('#network-routes tr')).toHaveLength(2);
  expect(document.querySelector('#baseline-result').textContent).toBe(
    '0 units total shortfall · 250¢ baseline route cost'
  );
  expect(document.querySelector('#scenario-status').textContent).toContain(
    'Synthetic sample ready'
  );

  document.querySelector('#disruption-button').click();
  expect(document.querySelector('#baseline-result').textContent).toBe(
    '30 units total shortfall · 50¢ baseline route cost'
  );
  expect(document.querySelector('#scenario-status').textContent).toContain(
    'No supplier is contacted'
  );
  expect(document.querySelector('#network-routes').textContent).toContain(
    'Disrupted'
  );
  expect(document.querySelector('#mitigation-results').textContent).toContain(
    '30 units'
  );
  expect(document.querySelector('#mitigation-results').textContent).toContain(
    'units once'
  );
  expect(document.querySelector('#mitigation-results').textContent).toContain(
    '¢'
  );
  expect(document.querySelector('#disruption-button').textContent).toBe(
    'Reset route'
  );

  document.querySelector('#disruption-button').click();
  expect(document.querySelector('#baseline-result').textContent).toBe(
    '0 units total shortfall · 250¢ baseline route cost'
  );
  dispose();
});

test('scenario controls update disruption, warning, and ranking assumptions', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const dispatchChange = selector =>
    document
      .querySelector(selector)
      .dispatchEvent(new Event('change', { bubbles: true }));

  document.querySelector('#disruption-severity').value = '50';
  dispatchChange('#disruption-severity');
  expect(document.querySelector('#baseline-result').textContent).toContain(
    '0 units total shortfall'
  );
  document.querySelector('#disruption-button').click();
  expect(document.querySelector('#baseline-result').textContent).toContain(
    '10 units total shortfall'
  );

  document.querySelector('#disruption-duration').value = '1';
  document
    .querySelector('#disruption-duration')
    .dispatchEvent(new Event('input', { bubbles: true }));
  expect(document.querySelector('#baseline-result').textContent).toContain(
    '0 units total shortfall'
  );

  document.querySelector('#disruption-duration').value = '10';
  document
    .querySelector('#disruption-duration')
    .dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#ranking-criterion').value = 'cost-then-shortfall';
  dispatchChange('#ranking-criterion');
  expect(
    document.querySelector('#mitigation-results').rows[0].cells[1].textContent
  ).toBe('emergency-buffer');

  document.querySelector('#disruption-route').value = 'south-lane';
  dispatchChange('#disruption-route');
  expect(document.querySelector('#network-routes').textContent).toContain(
    'Disrupted'
  );
});

test('imports valid pasted scenario JSON and round-trips the exported scenario envelope', () => {
  const dom = createPage();
  const { document } = dom.window;
  const source = JSON.parse(document.querySelector('#scenario-json').value);
  source.disruption.durationDays = 4;
  document.querySelector('#scenario-json').value = JSON.stringify(source);
  document.querySelector('#import-scenario').click();

  expect(document.querySelector('#data-status').textContent).toContain(
    'Scenario imported and validated'
  );
  expect(document.querySelector('#disruption-duration').value).toBe('4');
  expect(document.querySelector('#scenario-status').textContent).toContain(
    'Imported JSON scenario ready'
  );

  const exported = jest.fn();
  const exportDom = createPage({ downloadPlanFn: exported });
  exportDom.window.document.querySelector('#disruption-button').click();
  exportDom.window.document.querySelector('#export-plan').click();
  const record = exported.mock.calls[0][0];
  expect(record).toMatchObject({
    formatVersion: 1,
    scenario: { disruption: { routeId: 'north-lane' } },
    signal: { hypothetical: true },
    rankingCriterion: 'shortfall-then-cost',
    assumptions: {
      dataOrigin: 'Synthetic sample',
      advisoryOnly: true,
      noExternalActionsTaken: true,
      uncertaintyNotes: expect.any(Array),
      constraints: { horizonDays: 5 },
    },
  });
  expect(record.rankedMitigations).toHaveLength(3);

  const roundTrip = createPage();
  roundTrip.window.document.querySelector('#scenario-json').value =
    JSON.stringify(record);
  roundTrip.window.document.querySelector('#import-scenario').click();
  expect(
    roundTrip.window.document.querySelector('#data-status').textContent
  ).toContain('Scenario imported and validated');
  expect(
    roundTrip.window.document.querySelector('#disruption-duration').value
  ).toBe(String(record.scenario.disruption.durationDays));
});

test('imports record-oriented CSV including quoted commas through the planner', () => {
  const dom = createPage();
  const { document } = dom.window;
  const scenario = JSON.parse(document.querySelector('#scenario-json').value);
  scenario.suppliers[0].id = 'north, "primary"';
  scenario.routes[0].fromId = 'north, "primary"';
  document.querySelector('#scenario-json').value = toCsv(scenario);
  document.querySelector('#import-scenario').click();

  expect(document.querySelector('#data-status').textContent).toContain(
    'CSV scenario imported and validated'
  );
  expect(document.querySelector('#scenario-status').textContent).toContain(
    'Imported CSV scenario ready'
  );
  expect(document.querySelector('#network-routes').textContent).toContain(
    'north, "primary"'
  );
});

test('the documented CSV example imports as a valid scenario', () => {
  const dom = createPage();
  const csv = MANUAL.match(
    /### CSV format[\s\S]*?```csv\n([\s\S]*?)\n```/
  )?.[1];
  expect(csv).toBeDefined();
  dom.window.document.querySelector('#scenario-json').value = csv;
  dom.window.document.querySelector('#import-scenario').click();
  expect(
    dom.window.document.querySelector('#data-status').textContent
  ).toContain('CSV scenario imported and validated');
});

test.each([
  ['wrong,header\nvalue', 'CSV must start with record,id columns'],
  ['record,id\nmeta,"unfinished', 'CSV has an unclosed quoted field'],
])(
  'rejects invalid CSV (%s) without replacing the active scenario',
  (csv, message) => {
    const dom = createPage();
    const { document } = dom.window;
    const before = document.querySelector('#baseline-result').textContent;
    document.querySelector('#scenario-json').value = csv;
    document.querySelector('#import-scenario').click();
    expect(document.querySelector('#data-status').textContent).toContain(
      message
    );
    expect(document.querySelector('#data-status').dataset.state).toBe('error');
    expect(document.querySelector('#baseline-result').textContent).toBe(before);
  }
);

test('rejects malformed numeric CSV and unknown records without replacing active state', () => {
  const dom = createPage();
  const { document } = dom.window;
  const scenario = JSON.parse(document.querySelector('#scenario-json').value);
  const before = document.querySelector('#baseline-result').textContent;
  const invalidNumber = toCsv(scenario).replace('meta,,5,', 'meta,,bad,');
  document.querySelector('#scenario-json').value = invalidNumber;
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').textContent).toContain(
    'invalid horizonDays'
  );
  expect(document.querySelector('#baseline-result').textContent).toBe(before);

  document.querySelector('#scenario-json').value =
    `${toCsv(scenario)}\nother,unknown`;
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').textContent).toContain(
    'unknown record type other'
  );
  expect(document.querySelector('#baseline-result').textContent).toBe(before);
});

test('imports a CSV file using the same validation path as pasted CSV', async () => {
  const dom = createPage({ readFileTextFn: async file => file.contents });
  const { document, Event } = dom.window;
  const scenario = JSON.parse(document.querySelector('#scenario-json').value);
  const input = document.querySelector('#scenario-file');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ contents: toCsv(scenario).replaceAll('\n', '\r\n') }],
  });
  input.dispatchEvent(new Event('change'));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(document.querySelector('#data-status').textContent).toContain(
    'CSV scenario imported and validated'
  );
});

test.each([
  ['', 'CSV must start with record,id columns'],
  ['record,id\nmeta,,5,extra', 'has more values than its header'],
  ['record,id\nmeta,"line\nbreak"', 'cannot contain line breaks'],
])('rejects malformed CSV records (%s)', (csv, expected) => {
  const dom = createPage();
  const { document } = dom.window;
  document.querySelector('#scenario-json').value = csv;
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').textContent).toContain(
    expected
  );
});

test('rejects CSV with missing required numeric values without changing the plan', () => {
  const dom = createPage();
  const { document } = dom.window;
  const scenario = JSON.parse(document.querySelector('#scenario-json').value);
  const before = document.querySelector('#baseline-result').textContent;
  document.querySelector('#scenario-json').value = toCsv(scenario).replace(
    'meta,,5,',
    'meta,,, '
  );
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').textContent).toContain(
    'missing horizonDays'
  );
  expect(document.querySelector('#baseline-result').textContent).toBe(before);
});

test('requires unique singleton records and non-empty required text fields', () => {
  const dom = createPage();
  const { document } = dom.window;
  const scenario = JSON.parse(document.querySelector('#scenario-json').value);
  const csv = toCsv(scenario);
  document.querySelector('#scenario-json').value =
    `${csv}\nmeta,,5,shortfall-then-cost`;
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').textContent).toContain(
    'exactly one meta record'
  );

  document.querySelector('#scenario-json').value = csv.replace(
    'supplier,north,,,10',
    'supplier,,,,10'
  );
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').textContent).toContain(
    'supplier is missing id'
  );
});

test('rejects malformed or invalid JSON without replacing the active scenario', () => {
  const dom = createPage();
  const { document } = dom.window;
  const baselineBeforeImport =
    document.querySelector('#baseline-result').textContent;
  const scenarioJson = document.querySelector('#scenario-json');
  const validScenario = JSON.parse(scenarioJson.value);
  scenarioJson.value = '{';
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').dataset.state).toBe('error');
  expect(document.querySelector('#baseline-result').textContent).toBe(
    baselineBeforeImport
  );

  validScenario.destination.dailyDemandUnits = -1;
  scenarioJson.value = JSON.stringify(validScenario);
  document.querySelector('#import-scenario').click();
  expect(document.querySelector('#data-status').textContent).toContain(
    'Destination daily demand'
  );
  expect(document.querySelector('#baseline-result').textContent).toBe(
    baselineBeforeImport
  );
});

test('imports a JSON file through the injected file reader', async () => {
  const dom = createPage({ readFileTextFn: file => file.text() });
  const { document, Event } = dom.window;
  const scenario = JSON.parse(document.querySelector('#scenario-json').value);
  scenario.horizonDays = 2;
  const source = JSON.stringify(scenario);
  const input = document.querySelector('#scenario-file');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ text: async () => source }],
  });
  input.dispatchEvent(new Event('change'));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(document.querySelector('#data-status').dataset.state).toBe('ready');
  expect(document.querySelector('#scenario-status').textContent).toContain(
    'Imported JSON scenario'
  );
});

test('ignores an empty file selection and uses the browser file reader by default', async () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const input = document.querySelector('#scenario-file');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [],
  });
  input.dispatchEvent(new Event('change'));
  expect(document.querySelector('#scenario-status').textContent).toContain(
    'Synthetic sample ready'
  );

  const source = document.querySelector('#scenario-json').value;
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ text: async () => source }],
  });
  input.dispatchEvent(new Event('change'));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(document.querySelector('#data-status').textContent).toContain(
    'Scenario imported and validated'
  );
});

test('reports file read errors without replacing the current scenario', async () => {
  const dom = createPage({
    readFileTextFn: async () => {
      throw new Error('Local file could not be read.');
    },
  });
  const { document, Event } = dom.window;
  const baselineBeforeImport =
    document.querySelector('#baseline-result').textContent;
  const input = document.querySelector('#scenario-file');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [{ text: async () => '' }],
  });
  input.dispatchEvent(new Event('change'));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(document.querySelector('#data-status').textContent).toContain(
    'Local file could not be read'
  );
  expect(document.querySelector('#baseline-result').textContent).toBe(
    baselineBeforeImport
  );
});

test('reports export errors and unavailable plans or download adapters', () => {
  const unavailablePlan = createPage({
    planSupplyChainFn: () => ({
      error: 'invalid-input',
      issues: ['Invalid sample.'],
    }),
  });
  unavailablePlan.window.document.querySelector('#export-plan').click();
  expect(
    unavailablePlan.window.document.querySelector('#data-status').textContent
  ).toContain('Correct the scenario');

  const noAdapter = createPage();
  noAdapter.window.document.querySelector('#export-plan').click();
  expect(
    noAdapter.window.document.querySelector('#data-status').textContent
  ).toContain('Plan download is unavailable');

  const failedDownload = createPage({
    downloadPlanFn: () => {
      throw 'download failed';
    },
  });
  failedDownload.window.document.querySelector('#export-plan').click();
  expect(
    failedDownload.window.document.querySelector('#data-status').textContent
  ).toContain('Could not read scenario data');
});

test('compares current response with early warning using identical sample data', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  document.querySelector('#disruption-button').click();
  const earlyAvoided = document.querySelector('#mitigation-results').rows[0]
    .cells[5].textContent;
  expect(document.querySelector('#warning-signal').textContent).toContain(
    'EARLY WARNING'
  );

  const warningSelect = document.querySelector('#warning-lead');
  warningSelect.value = '0';
  warningSelect.dispatchEvent(new Event('change'));
  const currentAvoided = document.querySelector('#mitigation-results').rows[0]
    .cells[5].textContent;
  expect(document.querySelector('#warning-signal').textContent).toContain(
    'CURRENT RESPONSE'
  );
  expect(earlyAvoided).toBe('30 units');
  expect(currentAvoided).toBe('20 units');
});

test('shows planner validation issues in the live status region', () => {
  const dom = createPage({
    planSupplyChainFn: () => ({
      error: 'invalid-input',
      issues: ['Bad sample network.'],
    }),
  });
  expect(
    dom.window.document.querySelector('#scenario-status').textContent
  ).toBe('Bad sample network.');
  expect(
    dom.window.document.querySelector('#scenario-status').dataset.state
  ).toBe('error');
  expect(
    dom.window.document.querySelector('#baseline-result').textContent
  ).toBe('No plan available');
  expect(
    dom.window.document.querySelector('#mitigation-results').rows
  ).toHaveLength(0);
});

test('provides fallback text for an infeasible result without a reason', () => {
  const dom = createPage({
    planSupplyChainFn: () => ({
      baseline: { totalShortfallUnits: 1 },
      signal: {
        status: 'early-warning',
        leadTimeDays: 1,
        disruptionDay: 2,
      },
      rankingCriterion: 'shortfall-avoided-units',
      rankedMitigations: [
        {
          id: 'unavailable',
          kind: 'capacity',
          capacityUnitsPerDay: 0,
          arrivalDay: 9,
          feasible: false,
          reason: null,
          shortfallAvoidedUnits: 0,
          incrementalCostCents: null,
        },
      ],
    }),
  });
  expect(
    dom.window.document.querySelector('#mitigation-results').textContent
  ).toContain('Infeasible');
});

test.each([
  ['exceeds-available-capacity', 'Capacity limit exceeded'],
  ['exceeds-buffer-capacity', 'Buffer limit exceeded'],
  ['arrives-after-horizon', 'Arrives after the plan'],
])('explains the %s infeasibility reason', (reason, expected) => {
  const dom = createPage({
    planSupplyChainFn: () => ({
      baseline: { totalShortfallUnits: 1, totalCostCents: 0 },
      signal: {
        status: 'early-warning',
        leadTimeDays: 1,
        disruptionDay: 2,
      },
      rankingCriterion: 'shortfall-then-cost',
      rankedMitigations: [
        {
          id: 'unavailable',
          kind: 'capacity',
          capacityUnitsPerDay: 0,
          arrivalDay: 9,
          feasible: false,
          reason,
          shortfallAvoidedUnits: 0,
          incrementalCostCents: null,
        },
      ],
    }),
  });
  expect(
    dom.window.document.querySelector('#mitigation-results').textContent
  ).toContain(expected);
});

test.each([
  'warning-lead',
  'disruption-route',
  'disruption-severity',
  'disruption-duration',
  'ranking-criterion',
  'scenario-json',
  'scenario-file',
  'import-scenario',
  'export-plan',
  'data-status',
  'disruption-button',
  'scenario-status',
  'baseline-result',
  'warning-signal',
  'network-routes',
  'mitigation-results',
])('returns a harmless disposer if #%s is absent', id => {
  const dom = new JSDOM(PAGE);
  dom.window.document.querySelector(`#${id}`).remove();
  expect(() =>
    startSupplyChainNowcastingPage({ documentObj: dom.window.document })()
  ).not.toThrow();
});

test('the presenter has no network or browser-storage effects', () => {
  expect(APP).not.toMatch(/\bfetch\s*\(/);
  expect(APP).not.toMatch(/localStorage|sessionStorage/);
});

/**
 * Serialize scenario data to the documented CSV columns.
 * @param {Record<string, any>} scenario Scenario object.
 * @returns {string} CSV text.
 */
function toCsv(scenario) {
  const columns = [
    'record',
    'id',
    'horizonDays',
    'rankingCriterion',
    'capacityUnitsPerDay',
    'unit',
    'dailyDemandUnits',
    'startingInventoryUnits',
    'maxBufferUnits',
    'fromId',
    'toId',
    'maxCapacityUnitsPerDay',
    'leadTimeDays',
    'unitCostCents',
    'routeId',
    'startsDay',
    'durationDays',
    'reductionPercent',
    'warningLeadDays',
    'kind',
    'bufferUnits',
  ];
  const rows = [
    {
      record: 'meta',
      horizonDays: scenario.horizonDays,
      rankingCriterion: scenario.rankingCriterion,
    },
    ...scenario.suppliers.map(supplier => ({
      record: 'supplier',
      ...supplier,
    })),
    { record: 'destination', ...scenario.destination },
    ...scenario.routes.map(route => ({ record: 'route', ...route })),
    { record: 'disruption', ...scenario.disruption },
    ...scenario.mitigations.map(mitigation => ({
      record: 'mitigation',
      ...mitigation,
    })),
  ];
  return [columns, ...rows.map(row => columns.map(column => row[column] ?? ''))]
    .map(row =>
      row
        .map(value => {
          const text = String(value);
          return /[",\r\n]/.test(text)
            ? `"${text.replaceAll('"', '""')}"`
            : text;
        })
        .join(',')
    )
    .join('\n');
}
