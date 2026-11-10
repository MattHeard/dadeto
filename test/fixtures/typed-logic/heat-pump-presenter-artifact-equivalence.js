import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setImmediate as yieldEventLoop } from 'node:timers/promises';
import {
  heatPumpPresenterCases,
  heatPumpPresenterFormatCases,
  heatPumpPresenterWriteCases,
  heatPumpPresenterEventCases,
} from './heat-pump-presenter-cases.js';
import { observeHeatPumpPresenter } from './heat-pump-presenter-driver.js';
import { serializeCoverageSemantics } from './coverage-semantics.js';

const original = JSON.parse(
  readFileSync(
    new URL('./heat-pump-presenter-legacy-contracts.json', import.meta.url),
    'utf8'
  )
);
const formats = JSON.parse(
  readFileSync(
    new URL(
      './heat-pump-presenter-format-legacy-contracts.json',
      import.meta.url
    ),
    'utf8'
  )
);
const writes = JSON.parse(
  readFileSync(
    new URL(
      './heat-pump-presenter-write-legacy-contracts.json',
      import.meta.url
    ),
    'utf8'
  )
);
const events = JSON.parse(
  readFileSync(
    new URL(
      './heat-pump-presenter-event-legacy-contracts.json',
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
const sourceRoot = new URL('../../../', import.meta.url);
const fixtureHtml = readFileSync(
  new URL(
    'src/content/pages/industrial-heat-pump-readiness/index.html',
    sourceRoot
  ),
  'utf8'
);
const sha256 = value => createHash('sha256').update(value).digest('hex');
assert.equal(
  sha256(fixtureHtml),
  original.sourceHashes[
    'src/content/pages/industrial-heat-pump-readiness/index.html'
  ]
);
const cases = [
  ...heatPumpPresenterCases(),
  ...heatPumpPresenterFormatCases(),
  ...heatPumpPresenterWriteCases(),
  ...heatPumpPresenterEventCases(),
];
for (const candidate of process.argv.slice(2)) {
  const artifactRoot = path.resolve(candidate);
  const publishedHtml = path.join(
    artifactRoot,
    'industrial-heat-pump-readiness/index.html'
  );
  const html = existsSync(publishedHtml)
    ? readFileSync(publishedHtml, 'utf8')
    : fixtureHtml;
  assert.equal(html, fixtureHtml);
  const presentation = 'logic/core/industrial-heat-pump/presentation.js';
  assert.equal(
    readFileSync(path.join(artifactRoot, presentation), 'utf8'),
    readFileSync(new URL(`src/${presentation}`, sourceRoot), 'utf8')
  );
  const module = await import(
    pathToFileURL(path.join(artifactRoot, 'browser/industrialHeatPump/page.js'))
      .href
  );
  const observations = [];
  let snapshots = 0;
  for (const scenario of cases) {
    const states = observeHeatPumpPresenter(
      module.startIndustrialHeatPumpReadinessPage,
      html,
      scenario
    );
    const actual = states.map(state => ({
      step: state.step,
      sha256: sha256(serializeCoverageSemantics(state)),
    }));
    assert.deepEqual(
      actual,
      expected.get(scenario.name),
      `${candidate}: ${scenario.name}`
    );
    observations.push({ name: scenario.name, snapshots: actual });
    snapshots += actual.length;
    await yieldEventLoop();
  }
  console.log(
    JSON.stringify({
      artifact: candidate,
      html: existsSync(publishedHtml)
        ? 'published-page'
        : 'original-page-fixture',
      cases: cases.length,
      snapshots,
      outcomesSha256: sha256(serializeCoverageSemantics(observations)),
      projectionBytesMatchSource: true,
    })
  );
}
