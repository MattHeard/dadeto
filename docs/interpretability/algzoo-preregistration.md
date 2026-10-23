# AlgZoo M16,10 shared-map pilot preregistration

**Protocol version:** 1.0.4

**Status:** Frozen by the Git commit containing this document; no pilot outcomes have been collected or reviewed.
**Scope:** Exploratory validation pilot only. This protocol does not claim a confirmatory test or completion of the broader interpretability experiment.

## Registration and change control

Version 1.0.4 retains the typed causal-intervention record contract introduced in 1.0.3 and pins the compounding-cost analysis before any target assignment or outcome access. The commit and the SHA-256 of this file identify the preregistered version. Before any target assignment or outcome access, the launch manifest must record both values, the fixture hash, all model/tool versions and prompt hashes, randomization seeds or commitments, evaluator version, budgets, and access-control configuration. The manifest itself must be committed before assignment. If either file changes before assignment, increment the protocol version and freeze the replacement commit and hash. After assignment, preserve the frozen files and record any deviation as a dated, append-only amendment with its reason; do not silently revise outcomes, thresholds, exclusions, or analyses.

This is an exploratory pilot. It estimates feasibility, leakage, cost, outcome variability, and design inputs for a later confirmatory study. All analyses below are descriptive for this pilot; do not interpret a nonsignificant or unestimable effect as evidence of no effect. No pilot runs or experimental outcomes have been examined while writing this protocol.

## Question and estimands

Does access to completed, earlier shared interpretations reduce the cost of producing a novel, independently validated explanation of an AlgZoo recurrent unit, and does the cost advantage grow with validated map coverage?

The primary outcome is **cost per independently validated novel unit interpretation** by arm. For each target, charge all attempted work through the first passing interpretation; if none passes, charge the full fixed budget and retain the target as a failure. Report the total charged cost divided by the number of passing targets, the number of passes per 10,000 investigator tokens, and every failed attempt. If an arm has no passing targets, report its cost per pass as undefined rather than dropping its failures.

The preregistered compounding estimand is how the paired treatment-versus-control cost difference changes with the fraction of the 16 target units represented by earlier independently validated map claims at the start of each target pair. Report the slope and a target-paired 95% bootstrap interval, plus the coverage and paired costs for all 16 target pairs. This exploratory pilot does not use a significance threshold to establish a compounding effect.

The secondary whole-model outcome is the mean squared error (MSE) of each arm's structurally motivated accuracy estimates versus a matched-compute Monte Carlo sampling baseline on held-out perturbed weights. Report research/setup cost separately from estimator application compute. Local unit prediction and whole-model accuracy estimation are separate tracks; success or failure on one does not imply success or failure on the other.

## Pinned model and common background

Use the checked-in fixture `test/fixtures/interpretability/alg-zoo-m16-10.json` for ARC's trained `M_{16,10}` second-argmax RNN: 16 recurrent ReLU units, sequence length 10, no biases, and 432 parameters. The fixture pins AlgZoo source revision `4433f505a90e85a37d35d34f80f6cccf4a37cef4`, loader `example_2nd_argmax`, and checkpoint SHA-256 `498bd9a87c469e18e824a78e55c22843c7595776f1bfc2dfe07c36e5616218bb`. The task distribution is length-10 input sequences with independent standard-normal values; the target task is the index of the second-largest input. ARC's reported 95.3% accuracy is cited background, not a result of this study.

Both arms receive the same frozen bundle of public ARC analyses for this exact model, with source URLs and retrieval date. Claims already present in that bundle are not counted as novel. Their uncertainty and provenance must remain visible. Both arms receive identical model access and reference documentation. The treatment contrast is only access to experimental findings completed for earlier target pairs.

## Sampling, pairing, and randomization

The target population for this pilot is the **census of recurrent units 0–15**. Each unit is investigated once in each arm, yielding 16 paired targets and 32 independent target sessions. A time step is a repeated measurement within a target, not an independent target. No unit may be excluded for being difficult, inactive, or unproductive.

Before assignment, a seed in the frozen launch manifest generates a reproducible random permutation of the 16 unit IDs. Investigate one unit pair at a time in that order. For each unit, run one fresh, stateless control session and one fresh, stateless treatment session, randomizing their order. Lock both submissions and complete blinded scoring before starting the next unit pair. Release the completed treatment finding, its evidence, and its blinded score to the next treatment session only. No investigator session may span targets or conditions.

For held-out local validation, generate 1,024 length-10 standard-normal sequences per target from separate seeds committed in the launch manifest and inaccessible to investigators. The manifest must specify the exact PRNG and normal transform. Both sessions in a target pair use the same held-out set; different targets use independent sets. Reveal neither sequences nor unit activations before both submissions in the pair are locked. Scores remain hidden from investigators.

## Conditions and map release

**Control:** Each session sees the common public background and its assigned unit only. It cannot read, query, or receive any new experimental claim from another session. Control workspaces, retrieval endpoints, logs, and prompts are isolated from treatment.

**Treatment:** Each session sees the same common background and assigned unit, plus the immutable snapshot of all completed treatment findings for earlier target pairs. Each finding includes its hypothesis, evidence, status, provenance, and lineage. After blinded scoring and lock of a target pair, release its treatment finding, including a failed or uncertain claim and its score, to the next treatment snapshot; only independently validated claims count toward map coverage. Never expose control findings to treatment before final scoring.

The paired arms use the same pinned investigator model, system and task prompts, tools, target model access, output format, and per-target budgets. Retrieved map text and its processing count against the treatment token budget. Before the study, access-control tests must demonstrate that a control session cannot retrieve any treatment content and that treatment sessions can retrieve only findings from earlier target pairs. Record retrieval requests, returned entry IDs, snapshot hashes, prompt hashes, and access denials. A failed isolation check stops the study before assignments.

## Submission, budget, and outcome accounting

Each session must submit, before seeing any held-out result:

1. A concise functional hypothesis for its assigned unit over all ten time steps, including predicted conditions and non-conditions.
2. A runnable, single time-indexed prediction rule in the restricted JSON AST defined below, with at most 64 nodes. The evaluator applies the same rule to each of the ten time steps. It may not inspect future inputs, call the target model, load weight arrays, use loops or recursion, or look up a stored input/output table.
3. At least one discriminating prediction on an investigator-selected input and an explicit causal-evidence field. Either specify an intervention and predicted consequence or label the causal claim **not tested**. The fixed intervention operation sets the target unit's activation to zero at a stated time step while leaving all other activations unchanged, then continues the pinned recurrent pass; predict the resulting change in output index.
4. Claim provenance: public-background claims, new claims, retrieved map entry IDs, dependencies, and uncertainty.
5. All attempted hypotheses, counterexamples, tool calls, and work records, including unsuccessful attempts.

### Typed causal-intervention record

Store causal-intervention results in the separate `causalInterventionResult` field on an experiment record; do not encode the result only in hypothesis text or the free-form `causalEvidence` field. The field is optional on existing experiment records so earlier records remain importable. New AlgZoo submissions include either a strict `not-tested` record (with an optional reason) or a strict `tested` record.

A `tested` record names a `targetMechanismId` already listed by the experiment, the fixed `set-activation-zero` operation, and a zero-based time step from 0 through 9. It identifies the investigator-selected length-ten input by the lowercase SHA-256 of the UTF-8 bytes of its compact JSON array serialization. Record the predicted output index before intervention, the baseline output index without intervention, and the observed output index after intervention; each is an integer from 0 through 9. The binary `causalScore` is 1 exactly when the predicted and observed intervened output indices match, and 0 otherwise. `artifactSha256` identifies the replay artifact with the input and intervention details. This input is investigator-selected and is not part of the hidden held-out set. A tested record is not evidence of a held-out causal effect by itself.

### Restricted JSON prediction rule

The submitted rule is one JSON object per syntax-tree node. Objects are strict: fields not listed for that operator are rejected. Every node counts toward the 64-node limit, including constants, variables, and the `input.index` expression subtree. JSON structure cannot contain executable code, loops, recursion, or references to shared nodes.

| `op` | Fields | Meaning |
| --- | --- | --- |
| `constant` | `value` | One finite JSON number. |
| `time` | none | The current zero-based time step `t`, from 0 through 9. |
| `input` | `index` | Input `x[i]`; `index` is another rule node and must evaluate to an integer with `0 <= i <= t`. |
| `add`, `subtract`, `multiply`, `divide`, `max`, `lessThan`, `lessThanOrEqual`, `greaterThan`, `greaterThanOrEqual`, `equal` | `left`, `right` | Binary numeric operation. Comparisons return 1 for true and 0 for false; `equal` uses exact numeric equality. |
| `negate`, `relu` | `value` | Unary negation or `max(0, value)`. |
| `prefixSum`, `prefixMean`, `prefixMax`, `prefixMin` | none | The named reduction over `x[0..t]`, inclusive. |

For example, `{"op":"add","left":{"op":"input","index":{"op":"time"}},"right":{"op":"constant","value":0.25}}` predicts the current input plus 0.25. Every input sequence has exactly ten finite numbers. Division by zero, an out-of-prefix index, a non-finite intermediate, malformed object, or more than 64 nodes invalidates that prediction; it is not clipped, imputed, or silently scored as zero. An invalid prediction is retained as an attempted failure. Prefix reductions are always nonempty because `t` starts at zero. No other operators are permitted in protocol 1.0.3.

### Deterministic held-out scorer

The blinded evaluator receives exactly 1,024 input sequences of ten finite values and, for each target unit, a matching 1,024-by-10 matrix of reference activations. It evaluates the submitted rule at every time step using only the current sequence prefix. Invalid rules remain in the attempt records and receive a failed prediction status; the evaluator does not substitute a value.

For a target, compute the arithmetic mean and population standard deviation of its 10,240 held-out reference activations. The constant-mean benchmark predicts that single mean at every sequence and time step. Compute its MSE on the same 10,240 values. The normalization scale is `max(population standard deviation, 0.01)`. Candidate MSE is the mean squared error over the same values; aggregate normalized RMSE is `sqrt(candidate MSE) / scale`; per-step normalized RMSE is calculated for each of the ten time steps with the same scale and all 1,024 sequences. The candidate meets the prediction thresholds only when aggregate normalized RMSE is at most 0.10, every per-step normalized RMSE is at most 0.25, and candidate MSE is at most 10% of constant-mean MSE. If constant-mean MSE is zero, the last condition passes only for zero candidate MSE.

These held-out statistics are evaluator-only scoring benchmarks. They are computed after both submissions are locked and are never included in investigator requests. Prediction metrics and causal-intervention records remain separate from hypothesis text; passing the prediction thresholds does not establish novelty, reviewer agreement, or causal evidence.

The fixed cap per target session is **20,000 investigator-model tokens including retrieved context, 30 minutes elapsed time, 100 tool calls, and 10,000 target-model forward passes**, whichever is reached first. Record wall-clock researcher time, input/output tokens, tool calls, target-model inference compute, and direct monetary cost where available. Apply every cap equally to both arms. Charge setup, map curation, and evaluator costs separately and also report total study cost.

An interpretation is a **validated novel unit interpretation** only if (a) its claim is not already in the frozen public-background bundle; (b) its submitted restricted rule has aggregate normalized RMSE at most 0.10 over all 1,024 held-out sequences and ten time steps, where each unit's scale is `max(held-out activation standard deviation, 0.01)`; (c) normalized RMSE is at most 0.25 at every individual time step; (d) its error is at least 90% lower than the constant-mean predictor's MSE; and (e) two independent blinded reviewers agree that the claim is novel relative to the common background and is entailed by the submitted rule and cited evidence. A third blinded reviewer resolves disagreement. Reviewers see randomized submissions without arm, target order, investigator, map, or budget metadata. The deterministic scorer produces prediction metrics; preserve the numeric scores and each review decision so another operator can reproduce the aggregate report. Keep causal-intervention results in a separate field; a passing activation prediction does not establish causal evidence.

## Blinding and leakage checks

The evaluator receives submissions with arm, target order, investigator identity, map snapshot, and token counts removed. It uses a frozen scoring implementation and the held-out inputs. Investigators cannot read evaluator outputs, held-out inputs, or previous-target evaluator details during the pilot. Before assignment, run synthetic access-control probes: control attempts to retrieve a treatment-only canary and must be denied; treatment attempts to retrieve a future-target canary and must be denied. Verify from logs that no canary or held-out content reached an investigator prompt. Preserve raw access logs and hashes for an independent audit.

If any held-out content, future-target claim, or opposite-arm finding reaches an investigator, stop assignment, preserve the affected records, mark those targets contaminated, and report them as failures in the primary all-attempt accounting. Do not replace contaminated targets after outcomes are seen.

## Whole-model accuracy track

Each arm receives the same opportunity and budget to submit a reproducible, structurally motivated estimate of the original model's accuracy on the standard-normal task. The submission must state how unit/circuit claims imply the quantitative estimate and must not use held-out labels or a handcrafted replacement network as an explanation of the original model. A submission may explicitly report that the arm could not construct such an estimator.

Before assignments, the launch manifest freezes 32 perturbed weight sets: for each of the three weight tensors, add independent Gaussian noise with standard deviation equal to that tensor's root mean square (`sqrt(mean(weight^2))`) times one of 0.01, 0.05, 0.10, and 0.20; freeze eight committed seeds per scale. It also freezes separate input seeds for fitting, estimator development, and evaluation. Estimate reference accuracy for each held-out perturbed network using 100,000 evaluation sequences that neither arm can inspect. The estimator and the Monte Carlo baseline receive the same per-variant compute cap; derive the baseline sample count from that cap using the same pinned forward pass. Compare MSE across the 32 variants, report each scale separately, and distinguish estimator construction cost from application cost. If the frozen perturbations do not span accuracies differing by at least five percentage points, report that the planned material-variation condition failed and do not claim this track tested behavior across materially different accuracies.

## Planned analysis and reporting

- Report target-level pass/fail, attempt count, all cost dimensions, and paired treatment-minus-control differences for each of the 16 units. Failures remain in every denominator and summary.
- Report cost per validated novel interpretation, validated interpretations per 10,000 investigator tokens, and total cost including setup, map curation, and scoring.
- For the compounding analysis, define pre-investigation map coverage as the fraction of all 16 units with an independently validated treatment finding available before a target pair. Attach this same potential-coverage value to both rows in the pair; the control session never receives the map. Report a separate paired log-cost difference (natural log of treatment charged cost minus natural log of control charged cost) and ordinary-least-squares slope against coverage for each metered resource dimension: investigator tokens, elapsed milliseconds, tool calls, and target-model forward passes. Keep all 16 target pairs in assignment order, including failures; do not combine unlike resources into a single cost score. Compute a two-sided 95% target-paired percentile bootstrap interval from 10,000 resamples of 16 target pairs with replacement. Use the nonzero xorshift32 seed and replicate count recorded in the committed launch manifest; for each resample draw `floor(random * 16)` with replacement using the unsigned xorshift32 sequence (`x ^= x << 13; x ^= x >>> 17; x ^= x << 5`, then divide the unsigned value by 2^32). Skip bootstrap samples with constant coverage and report the number of estimable resamples. Use linearly interpolated empirical 2.5th and 97.5th percentiles at positions `(n - 1) * p`. If any pair has partial or nonpositive cost for a dimension, coverage does not vary, no resample is estimable, or the model is otherwise undefined, report the reason and all target-level data without dropping pairs or inventing an interval.
- Coverage advances sequentially and is associated with target order, so this pilot cannot separate coverage from order or accumulated practice. Treat the slope as exploratory association, not a causal compounding estimate. Report each pair's coverage and outcomes, retain contaminated/failed attempts, and do not conclude no effect from a nonsignificant result. Do not treat ten time steps or repeated attempts as independent targets.
- Report held-out activation prediction separately from causal-intervention evidence. For every causal claim, record a score or **not tested**.
- Report whole-model MSE-versus-compute separately from local interpretation outcomes, alongside the equal-compute Monte Carlo baseline and reference-accuracy uncertainty.
- Publish uncertainty, protocol deviations, leakage probes, negative and zero results, all attempted targets, and limitations. Label any analysis not specified here as exploratory.
- Run prespecified local-threshold sensitivity summaries at aggregate normalized RMSE cutoffs 0.05 and 0.20, retaining 0.10 as the sole primary threshold. Also report per-step cutoff sensitivity at 0.15 and 0.35 around the primary 0.25. These summaries do not change which outcomes count in the primary analysis.
- Use the pilot's paired log-cost differences to simulate 10,000 paired studies at 16, 32, 64, 100, 200, and 500 targets. For each size, resample target pairs with replacement, inject standardized paired effects of 0.2, 0.5, and 0.8, and estimate power using a two-sided paired test at alpha 0.05. Simulate the coverage slope separately by resampling sequential target records and report its interval width across those same sizes. Include sensitivity curves using 0.5, 1, and 2 times the observed paired variance. Label sizes above 16 as exchangeability-based extrapolations, not evidence from this model. Use the results only to plan a confirmatory study; freeze its protocol and fresh seeds/tasks before examining its outcomes.

## Reproduction manifest and stop conditions

Before randomization, commit a machine-readable launch manifest containing: this protocol version and file hash; Git commit; fixture path and hash; exact target and evaluator implementations; pinned investigator and evaluator model identifiers/revisions; tokenizer, prompts, tool and dependency hashes; all input, order, and perturbation seed commitments; the randomized 16-unit order; budgets; map schema and common-background bundle hashes; held-out data commitments; and access-control configuration. Keep held-out values inaccessible to both arms and publish them only after scoring is locked. An independent operator must be able to reconstruct the same assignments, inputs, scores, and aggregate report from the manifest and stored records.

Do not launch if any required manifest field, tool version, budget, access check, or held-out-data commitment is missing. If the evaluator or deterministic prediction format cannot be implemented as specified, stop before assignments and amend this protocol with a new version. After the pilot, design and preregister a separate confirmatory study using fresh seeds and tasks; do not use this exploratory pilot as confirmatory evidence.

## Source references

- [ARC's AlgZoo report](https://www.alignment.org/blog/algzoo-uninterpreted-models-with-fewer-than-1-500-parameters/) describes the 432-parameter `M_{16,10}` model, its reported 95.3% task accuracy, and the MSE-versus-compute comparison with sampling.
- [Pinned AlgZoo source revision](https://github.com/alignment-research-center/alg-zoo/tree/4433f505a90e85a37d35d34f80f6cccf4a37cef4) documents the `example_2nd_argmax()` loader and the model source.
- The local weight fixture and deterministic replay implementation are `test/fixtures/interpretability/alg-zoo-m16-10.json` and `src/core/interpretability/algZooReplay.js`.
