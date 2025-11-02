# 2025-05-19 – ADMIN_UID bridge shims

## What happened
- Reviewer feedback flagged the direct imports to `src/core/common-core.js` that slipped into the browser and cloud entry points.
- The copy script already expects each package to own a `common-core.js` shim, so the missing files created an inconsistent layering boundary.

## Lessons learned
- Whenever moving a shared constant, audit for existing shim patterns (browser/core/cloud) and replicate them before updating imports.
- Running the bundler or copy scripts is unnecessary to catch this next time—`rg 'common-core.js'` quickly shows where bridges already exist.

## Follow-ups
- None identified; the new shims align with the established module layout.
