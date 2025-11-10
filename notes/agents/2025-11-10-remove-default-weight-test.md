Removed the legacy guardrail test that defaulted a missing target variant weight to 1 because new requirements guarantee every variant carries an explicit weight.

Unexpected hurdle: `npm test` failed until I remembered the stale test still asserted the old behavior, so the clear fix was deleting that expectation rather than trying to keep the guardrail in place.

Lesson: keep the live tests aligned with current invariants before adding any new logic so the suite reports the right blockers.

Open questions: None.
