# JSON1 WebMCP tool (2026-10-11)

- Unexpected hurdle: the static site copied `core/browser` but not the new shared `core/capabilities` registry, so the built WebMCP module would have imported a missing file.
- Diagnosis: the site copy plan uses an explicit directory allowlist; adding a source module alone does not make it available in generated `public/` assets.
- Fix: registered `src/core/capabilities` in the shared directory and browser-tree copy plans, added copy-plan tests, exposed the strict `dadeto_canonicalize_json` WebMCP schema through the existing `document.modelContext` adapter, and documented local use.
- Evidence: focused browser, HTTP parity, and copy-plan tests passed 4 suites / 67 tests; TSDoc and `npm run build` passed. The built `public/` tree contains `core/capabilities/index.js`, `core/browser/webmcp.js`, and the JSON1 implementation.
- Open question: the current Codex task has no connected WebMCP-enabled browser surface, so a real natural-language agent invocation could not be performed here. The bead remains open for that required manual validation.
- Next-time guidance: whenever a browser core module imports a new shared core directory, verify both the static-site and cloud copy manifests include its runtime dependency chain.
