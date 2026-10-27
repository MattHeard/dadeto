# Tetracube construction acceptance

## Machine-checkable criteria

- [x] `npm run test:impact -- --files test/core/browser/game/tetracube.test.js` passes all 21 model tests.
- [x] `npm run check:impact:run -- --files src/core/browser/game/tetracube/tetracube.js src/core/browser/game/tetracube/world.js src/core/browser/game/tetracube/renderer.js src/core/browser/game/tetracube/page.js test/core/browser/game/tetracube.test.js test/core/browser/game/tetracube-world.test.js test/core/browser/game/tetracube-renderer.test.js test/core/browser/game/tetracube-page.test.js` reports complete changed-core coverage, with lint, core-parse, and zero-clone gates passing.
- [x] `npm run check` exits with status 0 for the current change set.
- [x] `npm run build` exits with status 0 and generates `public/tetracube/`.
- [x] `npm run manuals:check` exits with status 0.
- [x] `git diff --check` exits with status 0 after staging.
- [x] The playable prototype is registered at `/tetracube/` and its four page/world/renderer suites pass.

## Model criteria

- [x] Generate exactly eight canonical free tetracubes; every shape contains four face-connected cells and no two shapes are equivalent under translation and proper cube rotation.
- [x] Enumerate all distinct orientations for each shape from the 24 proper cube rotations.
- [x] Project cells deterministically; reject malformed, overlapping, or otherwise invalid placements without mutating the input structure.
- [x] Drop each valid piece rigidly along the vertical axis until its first ground or piece contact; a single voxel contact supports an overhang.
- [x] Removing support settles affected pieces immediately, including cascades, with no overlap and no remaining downward move.
- [x] Preserve stable piece identity, orientation, and position in state transitions and undo history.

## Evidence collection

- Record exact commands and outcomes in the owning Bead. Store generated test reports under the repository's existing `reports/` paths; do not add transient artifacts to source control.
- Record playtest observations in `docs/toys/tetracube/acceptance.md`, separating observed enjoyment from mechanical correctness.

## Current evidence (2026-10-23)

- The model suite passed 21 tests; the full toy-focused evaluator passed 49 tests, all changed-core statements/branches/functions/lines, ESLint, core parsing, and zero-clone checks.
- The repository fast check passed 7,434 tests across six shards and every static gate. `npm run build` and `npm run manuals:check` also passed.
- The generated standalone route and touch/keyboard controls are in place. No playtest has been recorded yet; observed enjoyment and friction remain open acceptance work.
- [ ] The `gcp-test` Cloud Run Playwright suite includes `test/e2e/tetracube.spec.ts`, which opens the single `/tetracube/` route and records touch controls, keyboard rotation/place/undo, a five-piece tower/overhang, mining, reset, movement and flight. A remote `gcp-test` run on the current pushed revision must pass and retain its attached screenshot and interaction record before this criterion is complete. The test does not add URL-driven game state and explicitly does not infer enjoyment.
- Playtest attempt (2026-10-23) was initially blocked before interaction because this session has no interactive browser-control capability and repository policy requires Cloud Run for Playwright. Investigation found that the supported `gcp-test` pipeline provisions a fresh isolated `t-*` deployment and executes the cloud Playwright configuration, so the focused interaction case is now included in that suite. No current-revision browser run or human playtest has yet been verified. Static source and unit tests do not establish the deployed toy's usability or enjoyment. Keep mechanics evidence separate from a human's subjective report; do not infer enjoyment from automation.

## Pass/fail rules

The current pure-model loop passes only when every model criterion has automated evidence, changed-core coverage is complete, and required local gates pass. The full Notion spec remains in progress until the browser toy is playable, its first tower/bridge playtest is recorded, and a follow-up design direction is documented.

## Isolating manual Cloud Run playtests — 2026-10-24

- The production workflow now applies after a successful scheduled `gcp-test` run only. A manually dispatched `gcp-test` run remains an isolated temporary deployment and does not chain into production Terraform apply; direct `gcp-prod` dispatch remains available.
- Workflow regression tests passed (2 suites / 8 tests). `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates after an elevated retry; six serial impact shards passed 1,042 suites / 7,585 tests, and duplication reported zero clones.
- No cloud playtest has been dispatched yet. After this guard is merged, run `gcp-test` manually, inspect its current-head Tetracube screenshot and interaction record, and record the observed mechanics. Do not infer enjoyment; a human playtest and design proposal remain outstanding.

## Cloud Playwright route missing from temporary deployment — 2026-10-25

The manually authorized `gcp-test` run [40154304810](https://github.com/MattHeard/dadeto/actions/runs/40154304810) completed Terraform Apply, fixture setup, and cleanup successfully, but Playwright failed because `/tetracube/` returned an empty title. Source inspection found that the workflow built and uploaded Dendrite's browser/core assets but did not build or stage the standalone Tetracube page under its temporary static prefix. The workflow now builds the site, copies only `public/tetracube/{index.html,game.js,styles.css}` to `${ENVIRONMENT}/tetracube/`, and waits for the entry page and game module before starting Playwright. A workflow regression asserts the build, t-* scoping, and readiness checks. Cloud Playwright success still needs a separately authorized fresh run; no enjoyment is inferred.

- Focused validation: `npm run test:impact -- --files test/core/browser/game/threefold-renderer.test.js test/scripts/gcp-test-workflow.test.js` passed both suites (64 tests); elevated `DADETO_CHECK_PROGRESS_INTERVAL_MS=3000 npm run check` passed all 10 gates (1,047 suites / 7,674 tests); `npm run build` and `git diff --check` passed.

## Retain Cloud Run Playwright evidence — 2026-10-25

Manual run [40163147750](https://github.com/MattHeard/dadeto/actions/runs/40163147750) passed and cleaned up its temporary environment, but its artifact listing had no E2E report. The report-download step tolerated missing folders and the GitHub upload step used `if-no-files-found: warn`, so the green test job did not prove the attached screenshot or interaction record was retained. The Cloud Playwright config now explicitly writes an HTML report and test-results directory; the runner fails if these directories are missing or GCS upload fails; GitHub requires the E2E files when the Playwright job ran. A regression covers the reporter, upload path, and artifact requirement. The source change still needs a separately authorized current-head `gcp-test` run; the human playtest and enjoyment/friction report remain outstanding.

## Retained cloud session and observed mobile friction — 27 October 2026

Current-code manual [gcp-test 40487647737](https://github.com/MattHeard/dadeto/actions/runs/40487647737)
at `5b97143617eab1c918675f3c1d1f4d16b89d56d0` retained
[e2e-t-239cf0a8, artifact 12728936135](https://github.com/MattHeard/dadeto/actions/runs/40487647737/artifacts/12728936135).
The HTML report embeds the interaction JSON in its base64 ZIP; it is not a
missing standalone attachment. The report records all 14 cases passed without
flakiness/skips. The Tetracube case took 1,863 ms and records five placements,
`5 placed · preview clear`, and touch ghost adjustments/placements plus keyboard
rotation. It also checks mining/settling, undo, reset, keyboard place/undo,
movement and flight. Its JSON explicitly says enjoyment was not assessed.

Inspected screenshot `playwright-report/data/061419e0ed84867bbecef7db2c0c5fcdbc511947.png`
has SHA-256 `cb94e5a2e3d4bad1029095ee2818850a48a3953c3b786db527e71d044d5609cf`.
It confirms rendered pieces, a crosshair, next-piece identity, placement/preview
feedback and reachable touch controls. It also exposes a real defect: on the
390-pixel page the canvas extends past the card's visible right edge, clipping
the world. The nearby five-piece structure fills much of the view. That is
observed visual friction, not proof of a satisfying full-tower overview.

### Experience record and next design direction

- Anticipation: the next-piece/colour label and ghost are visible; whether this
  creates anticipation for a player remains unassessed.
- Creative compromise: the scripted session offsets/rotates offered pieces and
  builds five placements, but does not measure a player's choices or compromises.
- Fits and imperfect growth: placement/readout changes work; subjective
  satisfaction and longer-term structure growth remain unassessed.
- Negative finding: the mobile world viewport is clipped, and this close camera
  view does not give a legible overview of the complete tower/overhang.
- First design response: constrain the existing viewport before adding mechanics.
  Then collect a short human tower/overhang session with stepping back/flying up
  and explicit fit/compromise/friction observations. Consider camera-distance or
  overview tuning only from that evidence; retain free construction without a
  new objective or larger progression system.

The follow-up in `dadeto-7qbo` adds `width: 100%` and `min-width: 0` to the wrapper,
preventing its 16:9 preference and minimum height from expanding its auto width.
A source-style regression failed before this change and passes afterward; four
mechanics/presenter suites plus that regression pass 50 tests. Cloud assertions
now check actual canvas/card bounds at 320 and 390 pixels. Those assertions are
not yet executed in a real browser on the fix, and a human enjoyment report is
still absent. Do not mark the whole playtest complete from static tests. Local
extracted records/hashes are in ignored `reports/playtests/gcp-40487647737/`.

The observed run40487647737 subsequently completed successfully, including
Terraform Destroy and temporary-prefix cleanup in both jobs. Its manual-run
production handoff40491417626 was skipped. The responsive-fix local loop passed
50 focused tests, a final focused layout rerun, all10 static gates via
`npm run check -- --skip-tests`, build and86-manual validation. The static-only
aggregate followed explicit focused tests; it is not full-suite/coverage or
real-browser evidence for the width fix. Exact current-code cloud bounds and
subjective playtest acceptance remain open.

## New-code mobile bounds verified in Cloud Run — 27 October 2026

Run [40492013314](https://github.com/MattHeard/dadeto/actions/runs/40492013314)
uses exact fix commit `81e9e845d1db560fa044e8671562ea5daf88b9e2`. Its retained
[artifact12730391693](https://github.com/MattHeard/dadeto/actions/runs/40492013314/artifacts/12730391693)
reports14/14 cases passed, no flakiness/skips. Tetracube passed in1,775ms,
including both actual320/390-pixel canvas/card bounds assertions. Matching
[Full Check40491777485](https://github.com/MattHeard/dadeto/actions/runs/40491777485)
succeeded. The screenshot and embedded JSON were inspected: five placements,
clear preview, centered crosshair and complete right canvas border within the
card. The earlier right-edge clipping is fixed in this browser evidence.

PNG `data/c3149c12bb6bda9ca1f15057d31a0d65cf807376.png` SHA-256:
`ff9117aa571155483970c0472b3c59c7bcbde3991ddcd927e1f306d02b28ab67`.
The workflow was still performing Terraform Destroy when inspected; terminal
cleanup must be recorded separately. The interaction explicitly leaves enjoyment
unassessed. A nonblocking request for actual tower/overhang human feedback is
pending; do not infer anticipation, creative compromise or satisfaction from
this automated session. Keep the broader playtest spec Partial.

Run40492013314 subsequently completed successfully, including both Terraform/
static-prefix cleanup jobs. The viewport fix's browser report and matching
Full Check40491777485 are terminal successes. Subjective playtest evidence
remains pending; keep the broader spec Partial for that acceptance.
