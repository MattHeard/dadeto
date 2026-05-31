# Duplication Clone Elimination

- Unexpected hurdle: the duplication gate reported three small clones, but two of them lived in separate core scripts and one was inside the Notion codex normalization code.
- Diagnosis: the repeated code was not accidental copy-paste in one place; it was the same small pattern repeated in multiple modules, so a local helper extraction was the safest way to remove it without changing behavior.
- Chosen fix: moved shared string-array normalization into `src/core/local/notion-codex/valueHelpers.js` and the shared spawn/launch-failure logic into `src/core/scripts/gate-utils.js`.
- Next-time guidance: when duplication shows up in multiple core modules, look for a tiny shared helper first before changing call sites independently.
