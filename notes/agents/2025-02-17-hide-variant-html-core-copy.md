# Hide Variant HTML core copy
- Confirmed the copy script only duplicated the Cloud Function wrapper, so the runtime kept re-exporting the core helper.
- Added an explicit individual copy entry to reuse the shared core implementation inside the Cloud Function output without touching the wrapper directory copy.
