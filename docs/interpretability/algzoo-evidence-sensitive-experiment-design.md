# Evidence-sensitive AlgZoo experiment-design proposal

`proposeAlgZooEvidenceSensitiveExperimentDesignV1(candidate, context, proposal)`
is a pure first example of the Atlas discovery → complete context → design path.
It accepts a resolved candidate and a complete, hashed context snapshot. The
initial planner is intentionally limited to the pinned AlgZoo M16,10 recurrent
neuron 0 / step 9 mechanism and an attributed hypothesis with an explicit scalar
threshold. Candidate and context must carry the same model, repository, source
revision, architecture, checkpoint and tokenizer identity.

The result is a proposed, untested design with exact hypothesis/evidence IDs and
typed `motivated-by`, `tests`, and, when present, `challenges` citations. An
observation-only context proposes a new-seed replication. When the complete
context also contains negative, null, or contradictory evidence, the design
switches to a 16-seed held-out sweep that excludes all seeds already attached to
relevant evidence. It measures every activation against the cited numeric
threshold, states rival outcomes and a weakening condition, and budgets one
fixture forward pass per input. The paired regression proves that adding the
negative record changes both the selected inputs and measurements.

The planner never executes a replay, infers a result, reads the network, writes
storage, or spends money. Pass the proposal through
`appendExperimentDesignV1` to validate its immutable record against the bundle;
portable persistence is separately versioned as bundle V7. A planned outcome is
not evidence that the experiment ran.

The seeded fixture and example are exercised by
`test/core/interpretability/evidenceReuseRoundTrip.test.js`. Broader candidate
discovery and evidence traversal contracts are covered by the adjacent
interpretability tests. No command-line submission adapter or storage-backed
concurrent submitter is provided by this slice.
