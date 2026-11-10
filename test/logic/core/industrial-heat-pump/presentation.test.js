import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setImmediate as yieldEventLoop } from 'node:timers/promises';
import { startIndustrialHeatPumpReadinessPage } from '../../../../src/browser/industrialHeatPump/page.js';
import {
  heatPumpPresenterCases,
  heatPumpPresenterFormatCases,
} from '../../../fixtures/typed-logic/heat-pump-presenter-cases.js';
import { observeHeatPumpPresenter } from '../../../fixtures/typed-logic/heat-pump-presenter-driver.js';
import { serializeCoverageSemantics } from '../../../fixtures/typed-logic/coverage-semantics.js';

const page = readFileSync(
  new URL(
    '../../../../src/content/pages/industrial-heat-pump-readiness/index.html',
    import.meta.url
  ),
  'utf8'
);
const original = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/heat-pump-presenter-legacy-contracts.json',
      import.meta.url
    ),
    'utf8'
  )
);
const formats = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/heat-pump-presenter-format-legacy-contracts.json',
      import.meta.url
    ),
    'utf8'
  )
);
const expected = new Map(
  [...original.observations, ...formats.observations].map(entry => [
    entry.name,
    entry.snapshots,
  ])
);
const names = new Set([
  'base',
  'preset-conservative',
  'preset-optimistic',
  'preset-__proto__',
  'multiple-errors',
  'zero-savings-hidden-nan',
  'heatPumpCop/0',
  'heatPumpCop/',
  'payback-100',
]);
const cases = [
  ...heatPumpPresenterCases().filter(
    entry => names.has(entry.name) || entry.name.startsWith('constraints-')
  ),
  ...heatPumpPresenterFormatCases(),
];

test.each(cases)(
  'preserves the independent original DOM/effect trace: $name',
  async scenario => {
    const states = observeHeatPumpPresenter(
      startIndustrialHeatPumpReadinessPage,
      page,
      scenario
    );
    expect(
      states.map(state => ({
        step: state.step,
        sha256: createHash('sha256')
          .update(serializeCoverageSemantics(state))
          .digest('hex'),
      }))
    ).toEqual(expected.get(scenario.name));
    // Permit closed jsdom windows to leave their current WeakRef lifetime.
    await yieldEventLoop();
  }
);
