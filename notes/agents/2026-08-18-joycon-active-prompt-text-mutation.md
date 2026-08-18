# JoyCon active-prompt-text mutation slice

- Unexpected hurdle: the full helper range generated eight mutants and was too slow for a reliable bounded run.
- Diagnosis path: narrowed scanning showed the relevant button and axis string branches, while the existing button assertion left the axis fallback untested.
- Chosen fix: added a direct axis-control assertion through `getActivePromptCopy`.
- Evidence: the narrowed Stryker run over lines 1573-1579 killed both mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: narrow mutation ranges around branch-specific string returns when the full helper scan is expensive.
