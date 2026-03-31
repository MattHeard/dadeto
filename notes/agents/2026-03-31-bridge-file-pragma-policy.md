# 2026-03-31 — Bridge-file pragma policy

- Unexpected hurdle: coverage surfaced several tiny bridge modules as 0%-covered even though they are import-path adapters, not behavior.
- Diagnosis path: scanned `src/core/**` for pure re-export `cloud-core.js` / `common-core.js` files and confirmed they are bridge shims.
- Chosen fix: added a uniform top-level `/* istanbul ignore file -- bridge file ... */` pragma directly in bridge files so exclusion is self-declared instead of top-level Jest globs.
- Next-time guidance: keep bridge intent local to the bridge file and reserve Jest config exclusions for non-bridge global cases.
