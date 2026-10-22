# THREEFOLD civic aftermath slice

- Unexpected hurdle: the first aggregate check reached TSDoc and reported a missing callback annotation in the newly derived witness-lead lookup.
- Diagnosis: `npm run tsdoc:check` identified the callback entry parameter; strict ESLint also required a return annotation.
- Fix: document the saved witness record and boolean result directly on the callback, then rerun ESLint, TSDoc, focused four-metric coverage, the aggregate check, build, and manual validation.
- Next time: run TSDoc on changed core files before starting the longer aggregate fallback when adding callback-based derived facts.
