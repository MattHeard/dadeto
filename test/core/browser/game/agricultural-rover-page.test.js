import { readFileSync } from 'node:fs';
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { startAgriculturalRoverPage } from '../../../../src/core/browser/game/agricultural-rover/page.js';

const PAGE = readFileSync(
  new URL(
    '../../../../src/content/pages/agricultural-rover/index.html',
    import.meta.url
  ),
  'utf8'
);
const SCRIPT = readFileSync(
  new URL(
    '../../../../src/content/pages/agricultural-rover/rover.js',
    import.meta.url
  ),
  'utf8'
);
const MODEL = readFileSync(
  new URL(
    '../../../../src/core/browser/game/agricultural-rover/agricultural-rover.js',
    import.meta.url
  ),
  'utf8'
);
const PAGE_CONTROLLER = readFileSync(
  new URL(
    '../../../../src/core/browser/game/agricultural-rover/page.js',
    import.meta.url
  ),
  'utf8'
);

test('publishes the rover comparison as an immediately editable standalone page', () => {
  expect(PAGE).toContain('<form id="rover-form">');
  expect(PAGE).toContain('id="results"');
  expect(PAGE).toContain('Download readiness brief');
  expect(PAGE).toContain('Import brief');
  expect(PAGE).toContain('What to ask before a pilot');
  expect(PAGE).toContain('Planning model only.');
  expect(SCRIPT).toContain(
    "from '/core/browser/game/agricultural-rover/page.js'"
  );
  expect(PAGE_CONTROLLER).toContain('compareRoverScenarios(input)');
  expect(MODEL).toContain('conservative:');
  expect(MODEL).toContain('optimistic:');
});

test('keeps the local calculation free of remote APIs and browser storage', () => {
  expect(PAGE_CONTROLLER).not.toMatch(/\bfetch\s*\(/);
  expect(PAGE_CONTROLLER).not.toMatch(/localStorage|sessionStorage/);
  expect(PAGE_CONTROLLER).toContain('URL.createObjectURL');
  expect(PAGE_CONTROLLER).toContain('validateRoverInput(report.inputs)');
});

/** @returns {JSDOM} A wired standalone page fixture. */
function createPage() {
  const dom = new JSDOM(PAGE);
  dom.window.URL.createObjectURL = jest.fn(() => 'blob:brief');
  dom.window.URL.revokeObjectURL = jest.fn();
  dom.window.print = jest.fn();
  dom.window.HTMLAnchorElement.prototype.click = jest.fn();
  startAgriculturalRoverPage({
    documentObj: dom.window.document,
    windowObj: dom.window,
  });
  return dom;
}

test('renders the default comparison, rejects invalid input, and handles download and print', () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  expect(document.querySelectorAll('.card')).toHaveLength(3);
  expect(document.querySelector('#status').textContent).toContain('assumed');

  document.querySelector('[name="areaSquareMeters"]').value = '0';
  document
    .querySelector('#rover-form')
    .dispatchEvent(new Event('submit', { cancelable: true }));
  expect(document.querySelector('#status').textContent).toContain(
    'greater than zero'
  );
  document.querySelector('#export-button').click();
  expect(document.querySelector('#status').textContent).toContain(
    'Correct the scenario'
  );

  document.querySelector('[name="areaSquareMeters"]').value = '10000';
  document.querySelector('[name="operatingWindowHours"]').value = '0.1';
  document
    .querySelector('#rover-form')
    .dispatchEvent(new Event('submit', { cancelable: true }));
  expect(
    document.querySelector('.card .metric:nth-of-type(2) strong').textContent
  ).toBe('No');
  document.querySelector('[name="operatingWindowHours"]').value = '8';
  document.querySelector('[name="laborHoursPerHectare"]').value = '0';
  document.querySelector('[name="baselineHourlyEuro"]').value = '0';
  document
    .querySelector('#rover-form')
    .dispatchEvent(new Event('submit', { cancelable: true }));
  expect(document.querySelector('.threshold').textContent).toContain(
    'no operating-cost headroom'
  );
  document.querySelector('#export-button').click();
  expect(dom.window.URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(dom.window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:brief');
  expect(dom.window.print).not.toHaveBeenCalled();
  document.querySelector('#print-button').click();
  expect(dom.window.print).toHaveBeenCalledTimes(1);
});

test('imports and recalculates a valid brief and reports malformed or invalid briefs', async () => {
  const dom = createPage();
  const { document, Event } = dom.window;
  const chooser = document.querySelector('#import-file');
  const report = {
    schemaVersion: 1,
    inputs: {
      jobType: 'weeding',
      areaSquareMeters: 10000,
      operatingWindowMinutes: 480,
      baseline: {
        laborHoursPerHectare: 10,
        hourlyCostCents: 2500,
        evidence: 'observed',
      },
      rover: {
        machineCount: 2,
        effectiveCoverageSquareMetersPerHour: 5000,
        batteryRuntimeMinutes: 60,
        chargeMinutes: 30,
        downtimePercent: 20,
        supervisionHoursPerMachineHour: 0.25,
        interventionsPerMachineHour: 0.5,
        interventionMinutes: 15,
        operatorHourlyCostCents: 3000,
        operatingCostCentsPerMachineHour: 1000,
        upfrontCostCents: 200000,
        comparableJobs: 100,
      },
    },
  };
  const change = async contents => {
    Object.defineProperty(chooser, 'files', {
      configurable: true,
      value: {
        item: () => (contents === null ? null : { text: async () => contents }),
      },
    });
    chooser.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 0));
  };

  await change(JSON.stringify(report));
  expect(document.querySelector('#status').textContent).toContain(
    'recalculated'
  );
  expect(document.querySelector('#status').textContent).toContain('observed');
  expect(document.querySelectorAll('.card')).toHaveLength(3);
  await change('{');
  expect(document.querySelector('#status').textContent).toContain(
    'Could not import brief'
  );
  await change(JSON.stringify({ ...report, schemaVersion: 2 }));
  expect(document.querySelector('#status').textContent).toContain(
    'Unsupported brief version'
  );
  await change(
    JSON.stringify({
      ...report,
      inputs: { ...report.inputs, areaSquareMeters: 0 },
    })
  );
  expect(document.querySelector('#status').textContent).toContain(
    'greater than zero'
  );
  await change(null);
});
