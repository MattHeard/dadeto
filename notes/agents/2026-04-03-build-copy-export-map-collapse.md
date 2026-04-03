# buildCopyExportMap collapse

- Hurdle: the `buildCopyExportMap` helper was just a naming wrapper around `entriesToObject`, which meant the build/copy callers had two names for the same tuple-to-object conversion.
- Diagnosis: the only behavior difference was API shape; the underlying object construction was already covered by `entriesToObject`.
- Fix: removed the wrapper, switched the build/copy/blog call sites to `entriesToObject`, and kept the helper test coverage on the core utility instead.
- Next-time guidance: if a wrapper adds no branching or transformation, prefer the underlying shared primitive and let the caller name the intent locally when needed.
