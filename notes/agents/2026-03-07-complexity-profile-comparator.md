## Complexity profile comparator

- Unexpected hurdle: the first attempt to validate this comparator spent more time fighting assumptions about raw warning counts and exact slice containment than proving the actual improvement signals.
- Diagnosis path: reused `typhonjs-escomplex` directly, inspected the real per-method report shape on `joyConMapper.js`, and aligned the comparator around method-level cyclomatic / excess metrics instead of ESLint warning text.
- Chosen fix: add `src/build/complexity-profile.js` as a companion CLI / module that compares baseline and current profiles for a file or overlapping line slice using warning count, peak cyclomatic complexity, and aggregate excess over threshold.
- Next-time guidance: when using this tool for future beads, capture a baseline artifact before refactoring and compare the same line slice after the change so SNC can judge peak/excess improvement separately from raw warning count.
