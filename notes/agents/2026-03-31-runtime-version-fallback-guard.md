# 2026-03-31 runtimeVersion fallback guard

- **Unexpected hurdle:** `npm test` failed in `test/local/symphony.test.js` because `getSymphonyRuntimeVersion` assumed parsed `package.json` always existed and dereferenced `null`.
- **Diagnosis path:** Ran full suite, traced stack to `src/local/symphony/runtimeVersion.js`, then verified with a focused Jest run for `test/local/symphony.test.js`.
- **Chosen fix:** Added optional chaining when reading `packageJson.version` so missing/invalid package metadata falls back to `'unknown'` without throwing.
- **Next-time guidance:** Keep fallback-path tests around runtime metadata readers since temporary repos and fixtures often omit root `package.json`.
