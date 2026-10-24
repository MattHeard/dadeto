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

The THREEFOLD Notion page is canonical; `docs/toys/threefold/spec.md` is a best-effort cache. Its synchronized section runs inclusively from `Creative north star` through `Reference context`; progress history outside those headings is excluded. Do not edit the generated file directly.

At implementation start and after completing and validating each subtask, optionally run `npm run threefold:spec:refresh:best-effort`. If Notion access is available, it refreshes the cache. If credentials, network, or the source are unavailable, the command exits silently and leaves the existing cache unchanged. After a successful refresh, reconcile remaining work against the updated section before continuing. For a deliberate strict refresh or live drift check, use `npm run threefold:spec:refresh` or `npm run threefold:spec:check`; these require `NOTION_THREEFOLD_SPEC_READ_TOKEN` and report failures.

`npm run threefold:spec:cache:check` validates the checked-in cache structure and deterministic metadata using local files only. Full Check runs this local-only command; CI makes no Notion requests and requires no Notion secret.

## How to create a new toy folder

1. Create a new folder at `docs/toys/<toy-name>/`.
2. Copy all template files from `docs/toys/_template/`:
   - `spec.md`
   - `acceptance.md`
   - `failure-modes.md`
   - `harness.md`
3. Replace placeholders with toy-specific details before opening or closing work loops.
4. Keep the same file names so tooling and reviewers can find expected docs quickly.
