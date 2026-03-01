The surprising part of this cleanup was how aggressive the repository lint thresholds are around cyclomatic complexity. Several functions were only one `if` over the limit, so the practical fix was not broad redesign but extracting tiny routing helpers that keep the original behavior readable while satisfying the configured ceiling.

Another useful pattern was to treat the warnings as clustered, not isolated. Once the new hi-lo files were cleaned up, the remaining warnings were in adjacent toy and cloud helpers touched during the earlier work. Clearing them in the same pass avoided leaving a "mostly clean" state that would immediately force the next agent back into context gathering.

If a future change adds another input handler or toy state machine here, run `npm run lint` before final verification and expect to do at least one extraction pass specifically for complexity. In this codebase, that is normal work, not polish.
