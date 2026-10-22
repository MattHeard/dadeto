# Rank 4 negative finding in investigator reuse

## Unexpected hurdle

The existing two-investigator AlgZoo reuse fixture used a second input whose replay also supported the first investigator's threshold claim. It proved reuse and provenance but did not demonstrate retention of a negative result.

## Diagnosis

The original second seed produced activation `9.00430679321289` for neuron 0 at recurrent step 9, so its observation was positive relative to investigator A's `>2.0` claim.

## Chosen fix

Use deterministic seed 2 for investigator B's distinct input. Its pinned replay is `0`, which is below the same claim's threshold. The fixture records B's observation and evidence as negative, adds an explicit `contradicts` edge to A's hypothesis and retains the `depends-on` edge from B's experiment to A's evidence. Portable V3 export/import checks both contributions, full input/procedure provenance, A's unchanged evidence, and B's negative records and edges.

Focused evidence: `npm run test:impact -- --files test/core/interpretability/evidenceReuseRoundTrip.test.js` passed 1 suite / 1 test. `npm run check` passed all 10 fast gates with the focused suite selected; duplication reported 0 clones. The test uses the checked-in AlgZoo tensor fixture and local Zod test double. No external inference, API, storage, or deployment was used.

## Next-time guidance

For reuse tests, choose a deterministic follow-up input that can actually falsify the prior claim. Keep the investigator's prediction, measured observation, negative evidence record, and graph-level contradiction edge separate. Do not describe a same-direction result as negative evidence.
