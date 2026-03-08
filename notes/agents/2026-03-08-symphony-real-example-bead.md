# 2026-03-08: replace placeholder Symphony example bead

- Bead: `dadeto-0cx3`
- Scope: replace the generic file-based example bead with one real Symphony-focused follow-up task in the documented scaffold format.
- Change:
  - updated `beads/open/example-bead.md` to keep the existing front matter shape
  - replaced the placeholder body with a concrete Symphony task about adding operator next-action guidance from `tracking/symphony/status.json`
- Validation:
  - direct inspection shows the file contains `project`, `estimate`, `created`, and a concrete Symphony task body
  - `npm test` passed with `467` suites and `2302` tests
- Follow-up:
  - if the example bead becomes stale relative to the queue shape, refresh or archive it using the 24-hour freshness rule in `projects/symphony/notes.md`
