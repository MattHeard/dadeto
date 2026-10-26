# Supply-chain Nowcasting Duration and Cost Model

The existing pure simulator handled a single capacity disruption indefinitely and ranked by shortfall avoided. Adding bounded duration, cost, and one-time buffer alternatives grew input validation beyond the repository's statement limit and exposed optional-value branches that could not occur after validation.

The validator was split into entity-specific helpers, keeping the public validation boundary explicit. The simulator now models route recovery, per-unit route and mitigation costs, one-time buffers, destination buffer limits, and two deterministic ranking criteria. Tests include hand-calculated outcomes and deterministic ordering for feasible and infeasible options.

The changed-core impact command is the right fast evaluator here: it checks focused tests, static gates, and exact line/branch coverage for the model and presenter. Document schema changes alongside model changes; the standalone UI still needs controls for duration/cost/buffer selection and scenario import/export.
