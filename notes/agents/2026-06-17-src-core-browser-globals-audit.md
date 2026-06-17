# src/core browser globals audit

- Unexpected hurdle: a naive `rg` over `src/core` is noisy because many hits are comments, docstrings, or local parameters named `fetch`.
- Diagnosis path: I checked the actual code sites in `src/core/browser/*`, `src/core/realtime/*`, and the browser wrappers to separate real global reads from injected dependencies.
- Chosen fix: keep the existing `src/core/browser/main.js` injection path, and treat the remaining direct reads as a short follow-up list rather than assuming the whole tree is equally unsafe.
- Findings:
  - `src/core/browser/document.js` still reads `document` and `window` directly by design as the DOM helper boundary.
  - `src/core/browser/moderate.js` still reads `document` and `fetch` directly and is the clearest next refactor target.
  - `src/core/browser/presenters/realtimeVoicePrototype.js` still reads `fetch` directly.
  - `src/core/realtime/openaiRealtimeCalls.js` falls back to global `fetch` when no injected implementation is supplied.
- Next-time guidance: if the goal is a strict `src/core` no-globals rule, add it as a lint or depcruise policy with explicit boundary exemptions, then wire the `moderate` and `realtimeVoicePrototype` entrypoints through injected deps first.
