# Toy Documentation Contract

Every toy/workflow experiment must ship a minimal documentation set so future loops can reason quickly.

## Mandatory per-toy docs

- `spec.md` — scope, purpose, actors, and explicit non-goals.
- `acceptance.md` — executable acceptance criteria with evidence commands/artifacts.
- `failure-modes.md` — known breakpoints and first-response playbooks.
- `harness.md` — local/CI harness instructions, required fixtures, and expected outputs.

## Suggested structure

Create one folder per toy under `docs/toys/` and include all four files above.
If a toy graduates to production behavior, retain docs as historical context and link to owning subsystem docs.

## THREEFOLD spec source

The stable requirements in the THREEFOLD Notion page are canonical. Its synchronized section runs inclusively from `Creative north star` through `Reference context`; progress history outside those headings is excluded. Edit that section in Notion, then run `npm run threefold:spec:refresh` to update `docs/toys/threefold/spec.md`. Run `npm run threefold:spec:check` to verify a local copy. The generated file includes its source link and last-edited timestamp and must not be edited directly.

Local refresh and CI check require `NOTION_THREEFOLD_SPEC_READ_TOKEN` from a dedicated Notion integration shared only with the canonical page and granted read-content access. Configure the same variable as a GitHub Actions repository secret. CI fails if the secret is missing or the page cannot be read; it never skips the drift check.

## How to create a new toy folder

1. Create a new folder at `docs/toys/<toy-name>/`.
2. Copy all template files from `docs/toys/_template/`:
   - `spec.md`
   - `acceptance.md`
   - `failure-modes.md`
   - `harness.md`
3. Replace placeholders with toy-specific details before opening or closing work loops.
4. Keep the same file names so tooling and reviewers can find expected docs quickly.
