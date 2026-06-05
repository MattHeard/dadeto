# 2026-06-05 · deprecated Playwright config cleanup

- Unexpected hurdle: `playwright.config.js` still existed and showed up in notes, which made it look like the blog smoke harness might still depend on it.
- Diagnosis path: searched scripts and workflow references, confirmed the active Cloud Run gcp-test path uses `playwright.config.ts`, and found no executable command that still required the legacy root config.
- Chosen fix: deleted `playwright.config.js` and updated `projects/browser-e2e-rigour/notes.md` so the active browser-e2e guidance no longer points at the removed file.
- Next-time guidance: if the legacy `e2e/` smoke harness is revived, give it an explicit dedicated config instead of reintroducing a second root-level Playwright config.
