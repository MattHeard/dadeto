# 2026-05-24 non-core-thin exemption removal

- Unexpected hurdle: removing an exemption directly caused the non-core-thin gate to fail because the file was still over 50 lines.
- Diagnosis path: inspected `non-core-thin-exemptions.json`, measured exempt file lengths, and selected `src/cloud/submit-moderation-rating/index.js` as a bounded wrapper candidate.
- Chosen fix: moved non-core assignment and rating dependency builders into `src/core/cloud/submit-moderation-rating/dependencies.js`, then kept the cloud entrypoint as thin wiring and removed its exemption.
- Next-time guidance: prefer removing exemptions from cloud files that can be reduced to dependency wiring and push complex read/write logic into `src/core` first.
