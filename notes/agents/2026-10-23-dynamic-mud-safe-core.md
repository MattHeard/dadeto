# Dynamic MUD safe core loop

- Unexpected hurdle: The repository's toy manual checker requires a `manual.md` and one blog manifest entry for every toy directory, beyond the four copied templates.
- Diagnosis path: `npm run manuals:check` identified the missing manual; `npm run check` then surfaced JSDoc lint and clone findings in the first interpreter draft.
- Chosen fix: Added a clearly labeled beta manual/blog entry, documented this slice as non-playable core groundwork, factored plain-object validation through the shared validation helper, and extracted edge matching to keep zero clones.
- Next-time guidance/open questions: Keep novel-command generation, UI, storage, and effect adapters in separate loops; the current core accepts only the finite versioned DSL. Treat `output` and `broadcast` as intents until a later adapter owns effects.
