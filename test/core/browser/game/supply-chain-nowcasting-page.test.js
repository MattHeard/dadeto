import { readFileSync } from 'node:fs';
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

/**
 * @param {Record<string, any>} [options] Test dependencies.
 * @returns {JSDOM} Wired page.
 */
function createPage(options = {}) {
  const dom = new JSDOM(PAGE);
  startSupplyChainNowcastingPage({
    documentObj: dom.window.document,
    ...options,
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
    'Sample network ready'
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

  document.querySelector('#disruption-button').click();
  document.querySelector('#disruption-severity').value = '50';
  dispatchChange('#disruption-severity');
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
