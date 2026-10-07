# AllowEffects for injected side effects

- Unexpected hurdle: the stats renderer mixes CDN invalidation with unrelated HTML generation and contains syntax the focused capability compiler mapping does not handle cleanly.
- Diagnosis: enabling the rule for the whole large module produced a source-mapping failure at an unrelated `import.meta.url` expression.
- Fix: extracted the invalidation POST into `cdn-invalidation.js`, where the permission is a direct parameter and the only transport is effect-specific.
- Next time: extend `capability/allow-effects` over focused effect modules; inspect `copy:dendrite` output before staging because generated infra files can include unrelated stale-file synchronization.
- Verification: targeted ESLint over the changed core modules passed after the extraction. `npm run check` has not been run in this loop.
