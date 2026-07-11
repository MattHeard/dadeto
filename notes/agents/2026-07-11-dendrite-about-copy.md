# Dendrite about-page copy

- Unexpected hurdle: the fresh worktree had no installed dependencies, so the first check run failed on missing tooling rather than the HTML change.
- Diagnosis path: `npm run check` showed missing `tsc`, parser, lint, and test packages; `npm install` restored the expected toolchain.
- Chosen fix: updated the static source-of-truth `infra/about.html` contributor paragraph and linked Dott to `https://ridedott.com`.
- Next-time guidance: install dependencies before interpreting aggregate-gate failures in a fresh Dadeto worktree.
