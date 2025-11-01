# Browser bridge re-export shims

- **Surprise:** The browser adapter still imported dozens of helpers directly
  from `src/core/` despite previous bridge work. Updating the entry point alone
  would have left `toys.js` leaking core paths, so I audited the entire file to
  confirm every remaining `../core` reference and introduced sibling re-export
  shims alongside the adapters.
- **Investigation:** I used `rg "../core" src/browser` to spot stragglers after
  adding the first shims. That surfaced nested imports such as
  `../core/browser/inputHandlers/removeElements.js`, which required creating a
  matching directory under `src/browser/inputHandlers/` so relative paths stay
  stable.
- **Resolution:** Added lightweight bridge modules (e.g.
  `src/browser/audio-controls.js`, `src/browser/inputHandlers/text.js`) that
  simply re-export the core implementation. Updating `main.js`, `document.js`,
  and `toys.js` to import through the new adapters keeps the browser surface
  consistent with the dependency-injection vision. A full Jest run (`npm test`)
  confirmed the copy and toy suites still execute against the reorganized
  imports.
- **Follow-up idea:** Consider wrapping the DOM bootstrap in a dedicated
  `main-browser.js` entry so HTML only loads the adapter bundle while the core
  remains pure. That would complete the outstanding action noted in
  `notes/entry-core-dependency-vision.md`.
