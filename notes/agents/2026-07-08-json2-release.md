# 2026-07-08 · JSON2 release publish

- Unexpected hurdle: `npm run build` initially failed because `prettier` was declared but missing from the local install state.
- Diagnosis path: I confirmed `src/build/blog.json` already held the new `JSON2` entry, then reinstalled dependencies and reran the build/check gates to separate the manifest work from the environment issue.
- Chosen fix: added `JSON2` as a public post in `src/build/blog.json`, then refreshed dependencies and verified the published feed through `npm run build` and `npm run check`.
- Next-time guidance: if the build dies on an imported package that is already listed in `package.json`, check the workspace install state before changing code, because the manifest may already be correct.
