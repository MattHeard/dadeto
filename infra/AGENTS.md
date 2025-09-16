# AGENTS Instructions for infra

## Scope

These instructions apply to everything under `infra/`.

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
