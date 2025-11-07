## Unexpected hurdle
Realized `buildOptionMetadata` is exported for direct testing, so removing the `consoleError` guard could break external callers if they relied on the optional contract. Spent extra time tracing imports (`loadOptions`, tests, and any ad-hoc scripts) to confirm every path already passes a logger, so leaning on the "logger is always truthy" assumption wouldn't surprise anyone.

## Diagnosis & options
Considered keeping the guard and just defaulting to a no-op logger, but that would silently swallow bugs if a caller forgets to pass one. Opted to enforce the truthy requirement instead so missing loggers surface immediately while still satisfying the new contract.

## Takeaways
When guidelines ask for behavioural assumptions (like a logger being truthy), grep the repo for call sites before changing signatures—there may be exported helpers or fixtures that still expect the old contract. Documenting that quick survey in PR notes can save reviewers from repeating it.

## Follow-ups
Should we codify logger requirements in `AGENTS.md` or a lint rule so future helpers avoid optional loggers altogether? Might be worth adding a tiny util like `requireLogger(name)` to make these contracts explicit.
