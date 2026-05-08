# 2026-05-07 Realtime voice prototype

- Unexpected hurdle: `bd` is required by repo workflow, but the executable was not available in this container (`bd: command not found`).
- Diagnosis path: followed the repository router, inspected the local Express server, browser asset copy flow, and official OpenAI Realtime WebRTC docs for the current `/v1/realtime/calls` unified interface.
- Chosen fix: kept the increment small by adding a Dadeto toy entry plus one local `/api/realtime/call` route that keeps `OPENAI_API_KEY` on the server and forwards only SDP/session configuration to OpenAI.
- Next-time guidance: if `bd` is restored, create/claim a bead before editing and record this loop contract/evidence there; otherwise keep durable evidence in notes and PR/testing output.

## Evidence

- `bd prime` could not run because `bd` was not installed in the container.
- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/realtimeSessionConfig.test.js test/local/openaiRealtimeCalls.test.js test/local/server.realtimeRoute.test.js` passed 7 tests.
- `npm run build` passed and copied the realtime voice toy module/presenter into ignored generated `public/` output.
- `npm run lint` completed with only pre-existing complexity warnings in `src/core/cloud/cloud-core.js` and `src/core/cloud/hide-variant-html/hide-variant-html-core.js`.
- `npm test` passed 501 suites / 2526 tests.

## Follow-up: toy conversion

- User feedback: the Realtime voice prototype should be a Dadeto toy rather than a standalone page.
- Change: moved the browser UI into a `realtime-voice` output presenter and added the `REAL2` toy metadata/core payload under the normal toy system.
- Evidence target: toy/core/presenter focused Jest suites, `npm run build`, `npm run lint`, and `npm test`.

## Toy conversion evidence

- `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/core/realtimeSessionConfig.test.js test/toys/2026-05-07/realtimeVoicePrototype.test.js test/browser/presenters/realtimeVoicePrototype.test.js test/local/openaiRealtimeCalls.test.js test/local/server.realtimeRoute.test.js test/generator/toyOutputDropdown.test.js` passed 15 tests.
- `npm run build` passed and generated the REAL2 toy entry plus realtime voice presenter in ignored `public/` output.
- `npm run lint` completed with only pre-existing complexity warnings in cloud files.
- `npx playwright install chromium && npx playwright install-deps chromium` enabled a local screenshot harness; screenshot captured at `reports/screenshots/realtime-voice-toy.png` after building and serving `http://127.0.0.1:4325/index.html#REAL2`.
- `npm test` passed 503 suites / 2529 tests after updating generator expectations for the new `realtime-voice` output option.

## Follow-up: local/cloud relay config

- User feedback: REAL2 needs JSON input that lets the user choose local or cloud server routing.
- Change: `realtimeVoicePrototype` now parses browser-safe JSON config, defaults to `{"server":"local"}`, uses `localEndpoint` for local mode, and uses `cloudEndpoint` when `{"server":"cloud"}` is selected.
- Presenter update: the output now displays `Session server: local server` or `Session server: cloud server`, and connection logs refer to the configured relay instead of always saying local.
- Evidence target: targeted toy/presenter tests, `npm run build`, `npm run lint`, and `npm test`.

## Follow-up: cloud relay implementation

- User feedback: the cloud relay option needs an actual cloud server implementation, not only a URL field.
- Change: added a `realtimeCall` Cloud Function under `src/cloud/realtime-call/`, moved the OpenAI SDP exchange helper into shared `src/core/realtime/openaiRealtimeCalls.js`, and kept the local server importing the same helper via a re-export.
- Packaging: `npm run build:cloud` now includes `realtime-call` and copies shared `src/core/realtime` helpers into the generated Cloud Function package.
- Infra: Terraform now packages and exposes `${var.environment}-realtime-call`, with a sensitive `openai_api_key` variable passed only to this function as `OPENAI_API_KEY`.
- Coverage hardening: added default-option, process-env, missing-location, and upstream-error assertions for the shared OpenAI Realtime SDP helper after full `npm test` showed the new helper below 100% branch coverage.
- Current evidence: `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --coverage --runTestsByPath test/local/openaiRealtimeCalls.test.js test/cloud/realtime-call/index.test.js` passed 11 tests and reported `core/realtime` at 100% statements/branches/functions/lines.
- Current evidence: `npm run build`, `npm run build:cloud`, `npm run lint`, and `npm test` passed; the final `npm test` run passed 504 suites / 2540 tests and kept `core/realtime` at 100% coverage.
- Workflow deviation: `bd prime` worked only before `.beads/issues.jsonl` was restored from an uncommitted deletion; after restoring the tracked issue file and removing the new untracked embedded Dolt byproduct, `bd status` reported no beads database found, so durable loop evidence was kept here instead of in a bead comment.
