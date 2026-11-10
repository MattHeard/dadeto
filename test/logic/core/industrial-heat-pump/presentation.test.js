import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setImmediate as yieldEventLoop } from 'node:timers/promises';
import {
  heatPumpPresenterCases,
  heatPumpPresenterFormatCases,
  heatPumpPresenterWriteCases,
  heatPumpPresenterEventCases,
} from '../../../fixtures/typed-logic/heat-pump-presenter-cases.js';
import { observeHeatPumpPresenter } from '../../../fixtures/typed-logic/heat-pump-presenter-driver.js';
import { serializeCoverageSemantics } from '../../../fixtures/typed-logic/coverage-semantics.js';

/** @type {typeof import('../../../../src/browser/industrialHeatPump/page.js').startIndustrialHeatPumpReadinessPage} */
let startIndustrialHeatPumpReadinessPage;
beforeAll(async () => {
  ({ startIndustrialHeatPumpReadinessPage } = await import(
    '../../../../src/browser/industrialHeatPump/page.js'
  ));
});

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
const writes = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/heat-pump-presenter-write-legacy-contracts.json',
      import.meta.url
    ),
    'utf8'
  )
);
const events = JSON.parse(
  readFileSync(
    new URL(
      '../../../fixtures/typed-logic/heat-pump-presenter-event-legacy-contracts.json',
      import.meta.url
    ),
    'utf8'
  )
);
const expected = new Map(
  [
    ...original.observations,
    ...formats.observations,
    ...writes.observations,
    ...events.observations,
  ].map(entry => [entry.name, entry.snapshots])
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
  ...heatPumpPresenterWriteCases(),
  ...heatPumpPresenterEventCases(),
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

test.each(['[data-error-for="heatPumpCop"]', '#validation-summary'])(
  'propagates a refused native textContent write at %s instead of ignoring it',
  selector => {
    const dom = new JSDOM(page);
    try {
      Object.defineProperty(
        dom.window.document.querySelector(selector),
        'textContent',
        { value: 'locked', writable: false }
      );
      expect(() =>
        startIndustrialHeatPumpReadinessPage({
          documentObj: dom.window.document,
          windowObj: dom.window,
          downloadJson: () => {},
          printPage: () => {},
        })
      ).toThrow(TypeError);
    } finally {
      dom.window.close();
    }
  }
);

for (const position of [1, 2]) {
  test.each([
    undefined,
    null,
    false,
    0,
    'read failed',
    Symbol('read failed'),
    new Error('read failed'),
    { code: 17 },
  ])(
    `propagates the exact form getter failure from boundary read${position}: %p`,
    error => {
      const dom = new JSDOM(page);
      const input = dom.window.document.querySelector('[name="heatPumpCop"]');
      const native = Object.getOwnPropertyDescriptor(
        dom.window.HTMLInputElement.prototype,
        'value'
      );
      let reads = 0;
      let thrown = false;
      Object.defineProperty(input, 'value', {
        configurable: true,
        get() {
          if (++reads === position) throw error;
          return native.get.call(this);
        },
        set(value) {
          native.set.call(this, value);
        },
      });
      try {
        try {
          startIndustrialHeatPumpReadinessPage({
            documentObj: dom.window.document,
            windowObj: dom.window,
            downloadJson: () => {},
            printPage: () => {},
          });
        } catch (actual) {
          thrown = true;
          expect(actual).toBe(error);
        }
        expect(thrown).toBe(true);
        expect(reads).toBe(position);
      } finally {
        delete input.value;
        dom.window.close();
      }
    }
  );
}
