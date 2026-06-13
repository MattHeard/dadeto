# Canvas Doodle Public Release

- Hurdle: the toy was deployed but remained hidden behind `?beta`, so a hash-only Playwright probe made it look broken.
- Diagnosis: the browser gate lives in `public/core/browser/beta.js` and only reveals `article.release-beta` when `window.location.search` contains `beta`.
- Fix: removed the beta release marker from `src/build/blog.json`, rebuilt the site, and verified `https://mattheard.net/#CANV1` now works without `?beta`.
- Next time: when a toy appears hidden on the live site, check both the URL query gate and the generated `release` field before assuming the presenter is failing.
