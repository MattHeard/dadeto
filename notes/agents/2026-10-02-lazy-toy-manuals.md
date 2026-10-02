# Lazy toy manuals

Canonical prose remains in `docs/toys/<name>/manual.md`. Blog manual entries
reference `/manuals/<name>.md`; generation publishes those files separately.
`scripts/sync-blog-manuals.js` updates references in place, preserving ordered
post content. `npm run manuals:check` checks one reference per canonical manual
and rejects embedded prose.

The shared browser controller fetches only on opening, caches successful text,
deduplicates pending requests, and leaves collapsed panels collapsed when a
request finishes. It renders text rather than HTML. Failed requests display a
retry instruction; closing and reopening retries. Legacy inline test fixtures
still toggle without requesting a resource.

Regression entry points: `test/core/browser/manual.test.js`,
`test/core/build/manuals.test.js`, and
`test/mosslight-e2e/manual.spec.ts` (phone and desktop request timing/retry).
Sandboxed local browsers require permission to bind port 4173; use repo-local
TMPDIR when the system temporary filesystem is full.

## Verified evidence

- Focused Jest: 16 tests passed; both new modules have 100% coverage on all
  metrics (`.tmp/manual-unit-final.log`, `.tmp/manual-coverage`).
- Local Playwright: four phone/desktop tests passed
  (`.tmp/manual-browser-final.log`).
- Build and manual validation passed with 75 published Markdown assets. Compact
  manifest size fell from 372597 to 180664 bytes; content order is unchanged.
- Full check (`.tmp/manual-check-final.log`): tests and aggregate coverage passed
  at 100% across all metrics; nine static gates passed. Duplication alone failed
  with the unchanged 138-clone baseline, tracked by `dadeto-aaou`.
- Feature commit `6d5a80a6e4` deployed successfully in production workflow
  `37037193282`; the live Markdown asset and loader were verified over HTTP.
