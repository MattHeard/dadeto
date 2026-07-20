# Wayback story import

- Unexpected hurdle: the repository has no direct HTML parser dependency, so the local tool needed a bounded dependency-free parser.
- Diagnosis: existing Dendrite pages expose metadata and graph edges as ordinary headings, main content, and links; targeted extraction keeps the script read-only and portable.
- Chosen fix: added sequential timestamp-preserving fetches with cache, timeout, retry/backoff, deduplication, parent provenance, and JSON migration-package output.
- Next-time guidance: add fixture-based traversal tests with representative archived Dendrite HTML before expanding selectors for older page layouts.
