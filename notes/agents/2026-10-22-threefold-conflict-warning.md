# THREEFOLD projection conflict warning

- Unexpected hurdle: the first focused page run exposed fixtures that intentionally omit optional page nodes, so the new warning lookup initially threw before those existing tests could complete.
- Diagnosis: the new standalone warning element is present in the actual page, but the page adapter already supports partial documents in tests and optional contexts.
- Fix: make the warning renderer return when its optional node is absent; cover present, cleared, repeated, and unchanged-frame cases.
- Next time: when adding page-level status, include the element in the shared fake document and preserve tests that exercise partial DOM surfaces. Keep projection warnings display-only; do not turn them into geometry or collision changes.
