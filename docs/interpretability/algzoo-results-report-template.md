# AlgZoo M16,10 results report template

Use this template only after the preregistered run is locked and scored. Follow
the frozen [pilot preregistration](./algzoo-preregistration.md); this document
does not change its metrics, thresholds, exclusions, or analysis plan.

> **Current repository state:** no pilot outcomes have been collected or
> reviewed. This blank template is not a result. Do not fill missing values
> with zero or copy synthetic unit-test values into a results report.

## Run record

- Report status: `not-run` | `locked` | `scored`
- Protocol version and SHA-256:
- Commit and launch manifest:
- Fixture revision and checkpoint SHA-256:
- Evaluation-data commitment and access-control record:
- Deviations and amendments:

## Local interpretation progress

This section reports unit-level interpretation work only. It does not measure
whole-model predictive accuracy.

- Target units attempted: `/ 16`
- Independently validated novel interpretations: `/ 16`
- Attempts with no passing interpretation:
- Cost per passing interpretation: value or `not-estimable` when no target
  passes; never omit failed attempts from the denominator or cost total.
- Passing local held-out prediction results: counts, normalized RMSE, and
  per-step scores, with uncertainty and the preregistered thresholds.
- Causal-intervention results: `tested`, `not-tested`, `null`, negative, or
  contradictory, with the linked experiment and evidence IDs.
- Treatment and control coverage, paired costs, and the exploratory coverage
  slope with its interval:

List every target pair, including failed, null, negative, contradictory,
unestimable, contaminated, and incomplete attempts. Do not treat time steps,
retries, or observations as independent target units.

| Pair / target | Arm | Map coverage before pair | Attempts | Local result | Held-out local score | Causal status | Cost | Failure or null reason |
| --- | --- | ---: | ---: | --- | --- | --- | ---: | --- |
|  |  |  |  |  |  |  |  |  |

## Whole-model predictive accuracy

This section reports performance of accuracy estimates across held-out
perturbed models. It is independent of the local interpretation counts above.

- Evaluation status: `not-run` | `not-estimable` | `measured`
- Held-out split ID and commitment:
- Number of variants and evaluation sequences per variant:
- Sampling-baseline implementation, revision, path, and seed commitment:
- Compute budget and measured compute for each method:
- Reference-accuracy uncertainty and material-variation result:
- Overall mechanistic-estimator MSE:
- Overall matched-compute sampling-baseline MSE:
- Per-scale mechanistic and sampling MSE:
- Research/setup cost, reported separately from application compute:

Report every preregistered perturbation variant, including null, negative,
failed, excluded-by-protocol, and unavailable measurements with the reason.
Use `null` plus a status and explanation for missing or unestimable metrics;
zero is a measured value only when the underlying calculation produced zero.

| Variant | Noise scale | Reference accuracy | Mechanistic estimate | Sampling estimate | Mechanistic compute | Sampling compute | Status / reason |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
|  |  |  |  |  |  |  |  |

## Interpretation and limitations

- State local-interpretation conclusions separately from whole-model accuracy
  conclusions.
- Do not infer whole-model predictive success from a validated local unit
  interpretation, or local-map effectiveness from a whole-model MSE result.
- Report uncertainty, null and negative outcomes, all protocol deviations,
  leakage probes, and limitations.
- Label unregistered analyses as exploratory. A nonsignificant, unavailable,
  or unestimable result is not evidence of no effect.

## Reproducibility artifacts

- Portable research bundle:
- Accuracy evaluation record:
- Per-target submissions and evidence:
- Scoring and report-generation revision:
- Independent reproduction command and result:
