# Author moderator reputation

- Unexpected hurdle: the fresh worktree was missing installed Babel dependencies, and the aggregate gate exposed an existing nullable-string type error.
- Diagnosis: `render-author` produces static HTML only when an author is dirty, so reputation changes also need to mark an existing matching author dirty.
- Fix: load `moderators/{authorId}.moderatorReputation`, render `Math.round(score * 100)%`, and invalidate existing author records during reputation recalculation.
- Next time: use `npm run test:unit` or `npm run check` rather than invoking Jest directly because the direct command does not enable the repository's ESM `import.meta` harness.
