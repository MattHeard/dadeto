## Body Guard Helper

- **Surprise**: The latest jscpd report kept flagging the `if (!body) { return false; }` guard in both `report-for-moderation` and `submit-new-story`, even though their property checks differed, so the duplication felt counterintuitive.
- **Diagnosis & fix**: Added `whenBodyPresent` to `cloud-core.js` so both handlers delegate the presence check before performing their semantics (variant string detection vs. object response). Reusing the helper meant the repeated guard vanished from the duplication report and left the domain-specific logic more concise.
- **Follow-up**: We already reran `npm run duplication`, `npm run lint`, and `npm test`; the tooling passes but still highlights other clone groups (cyberpunk adventures, moderation helpers), so another pass on those will be the next target.
- **Open questions**: Should `whenBodyPresent` be expanded into a broader request validation helper (e.g., coupling it with type guards) before applying it elsewhere, or is the current minimal form enough for the remaining guard-like duplicates?
