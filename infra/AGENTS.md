# AGENTS Instructions for infra

## Scope

These instructions apply to everything under `infra/`.

## General Recommendations for Future Agents
- Consult the repository-wide guidelines and prior retrospectives before modifying infrastructure to align with established patterns and avoid hidden pitfalls.
- Script and stage broad Terraform or HTML updates incrementally, validating each change and updating related documentation as you proceed.
- Run the expected lint, test, or validation commands early and often, capturing the results for your commit or PR notes.
- Harden changes defensively by checking for nulls, sanitizing inputs, and addressing lint warnings directly so deployments behave predictably.
- Keep these instructions cohesive with the root guidelines when adding new infra policies, and document lessons learned in retrospectives for future reference.
- Communicate clearly through descriptive commits and PR summaries that outline the intent, testing, and any deployment considerations.
- If core paths are renamed or moved, update Terraform references and any copy scripts in the same change—don’t assume infra will stay in sync automatically.

## Static vs generated HTML

Several HTML files in this directory are uploaded verbatim to the static site
bucket via Terraform. The committed copies are the source of truth for the
following pages: `404.html`, `about.html`, `admin.html`, `manual.html`,
`mod.html`, `new-page.html`, and `new-story.html`. Update these files directly
when you need to change their markup.

Other HTML assets that appear on the live site are produced by Cloud Functions
in `infra/cloud-functions/`. The `render-contents` function writes `index.html`
and `contents/{page}.html`, `render-variant` renders story and author pages
under `p/*.html` and `a/*.html`, and `generate-stats` produces `stats.html`.
Do not try to add or edit those generated files in Terraform; instead adjust
the corresponding Cloud Function implementation.
