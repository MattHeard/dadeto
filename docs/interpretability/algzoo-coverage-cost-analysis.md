# AlgZoo map-coverage cost analysis

`analyzeAlgZooCoverageCostTrendV1` implements the preregistered exploratory
association between pre-pair validated-map coverage and treatment-minus-control
log resource costs. It reports a separate trend for investigator tokens, elapsed
milliseconds, tool calls, and target-model forward passes; it does not combine
unlike resources into a fabricated single cost score.

The input is the complete, locked set of 16 target pairs in assignment order.
Each pair supplies the common pre-pair coverage fraction and the charged cost
for both arms. Charged costs must already include all attempts required by the
frozen protocol. Failed, contaminated, and incomplete pairs stay in the output.
Partial cost measurements and zero resource costs are retained but marked
`not-estimable` for the affected dimension; no pair is silently dropped.

For each estimable resource, the analyzer fits ordinary least squares to
`log(treatment cost) - log(control cost)` against pre-pair coverage. It uses a
target-paired percentile bootstrap with its replicate count and nonzero seed
recorded in the launch manifest (the preregistered pilot setting is 10,000),
and linearly interpolated 2.5th/97.5th percentiles. The
report labels the slope as exploratory because coverage is sequential and may
track target order or accumulated practice. If coverage is constant or any pair
cost is incomplete, it reports the data and a `not-estimable` reason instead of
an interval.

Tests use synthetic fixtures only to verify the computation. They are not
AlgZoo pilot records, and the analyzer does not create or imply a study result.
No provider, inference, or held-out data access is part of this command boundary.
