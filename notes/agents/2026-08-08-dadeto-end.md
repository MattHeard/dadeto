# dadeto-end Symphony launcherCodex TSDoc cleanup

- Unexpected hurdle: the shared detached-process launcher intentionally accepts broad records, while Ralph launch callbacks require bead-specific fields and a narrower exit payload.
- Diagnosis path: focused the four diagnostics on the launcher factory boundary and compared its callback signatures with `process-launcher.js`.
- Chosen fix: cast only the injected shared-launcher boundary, explicitly narrow the Ralph payload for prompt construction, and preserve the existing launch behavior.
- Evidence: `launcherCodex.js` contributes zero TSDoc diagnostics; `test/local/symphony.launcherCodex.test.js` passes all 4 tests.
