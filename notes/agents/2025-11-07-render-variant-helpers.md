# Render variant helpers inline move

## What surprised me
- Moving `escapeHtml`/`buildAltsHtml` out of their helper module caused an immediate circular dependency because `buildHtml.js` still imported `escapeHtml`. The render core also consumed `buildHtml`, so simply re-pointing imports would have triggered a cycle.
- After inlining the helpers into `render-variant-core.js` I accidentally trimmed part of the HTML template, which the Jest suite caught via the missing "Other variants" link and admin scripts.

## How I diagnosed/fixed it
- Rather than fight the cycle, I inlined both `buildHtml` and `buildAltsHtml` (plus `escapeHtml`) directly into `render-variant-core.js` and turned the old helper files into thin re-export shims. This kept existing import paths working without changing the copy pipeline.
- I used the failing `test/cloud-functions/buildHtml.test.js` expectations to diff against `public/core/cloud/render-variant/buildHtml.js`, then copied the full template (including the client-side variant router script) back into the core module to restore behavior.

## Guidance for the next agent
- When relocating shared helpers, check for modules that import each other through transitive paths—converting the old files into re-exports is a quick escape hatch that keeps tooling happy.
- If a huge template suddenly loses branches, compare against the `public/` mirror to ensure no snippets were dropped; that directory acts as an easy snapshot of the intended output.

## Open questions
- Should we eventually delete the re-export shim files and update the copy script, or do we want to keep them as permanent compatibility layers?
