# 2026-03-15 dadeto-hikw runner loop
- unexpected hurdle: eslint complexity=2 caps meant the first guard-with-or-or-twice approach still counted as 3, so the warning stuck even after breaking the condition away.
- diagnosis path: reran `npm run lint`, confirmed the only remaining warning in the targeted slice was `parseJsonObject` and noticed any extra `if`/`? :`/`&&` sequences still bumped the reported complexity.
- chosen fix: extracted object validation into a `toRecord` helper so `parseJsonObject` now only has the single `if (!parsed.ok)` branch before delegating into the helper; added the missing jsdoc and reran the lint target to prove the slice no longer complains.
- next-time guidance: when a core-lint rule caps at 2, keep the exported function to a single logical branch and delegate the rest to narrow helpers so the reported complexity stays within the slice.
