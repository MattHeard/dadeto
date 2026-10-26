# Supply-chain Nowcasting UI Controls

The standalone page originally showed a fixed two-route sample and a single disruption toggle. It did not expose the duration, severity, route, ranking preference, or buffer/cost tradeoffs now represented by the pure planner.

The presenter now populates a route selector from the sample and binds the scenario controls directly to the planner. Results include baseline route cost, route unit costs, one-time versus daily mitigation supply, arrival, feasibility, shortfall avoided, and incremental cost. Infeasibility codes render as concise human-readable labels. The feature remains synthetic and advisory.

The changed-core impact runner accepts core and test files for scoped coverage. Passing HTML or CSS paths causes it to fall back to all tests and skip coverage, so limit that command to `src/core` and test paths. Explicit tests for each human-readable infeasibility reason keep every presenter branch covered.

JSON/CSV dataset entry and complete auditable import/export remain separate implementation slices.
