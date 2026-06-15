# FRAC1 Publish

- Unexpected hurdle: promoting FRAC1 required regenerating tracked `public/` assets, not just flipping `src/build/blog.json`.
- Diagnosis path: confirmed the manifest change in `src/build/blog.json`, rebuilt the site, and verified the rendered `public/blog.json` and `public/index.html` outputs before rerunning the gates.
- Chosen fix: set FRAC1 to `public`, updated the copy to remove the beta wording, and let the build pipeline rewrite the checked-in public assets.
- Next time: when a toy is promoted, update the source manifest first and treat `npm run build` output as the publication artifact to verify before closing the bead.
