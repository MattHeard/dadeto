# Reproduce the AlgZoo coverage-cost report

After a preregistered run is locked, save the complete 16-pair cost input as
JSON with the protocol version, bootstrap seed and replicate count from the
committed launch manifest. Generate the same Markdown report from those stored
records with:

```sh
npm run interpretability:algzoo:render-coverage-cost-report -- path/to/locked-pairs.json
```

The command validates the input, runs the pure v1 coverage-cost analyzer, and
prints the report to standard output. It reports investigator tokens, elapsed
milliseconds, tool calls, and target-model forward passes separately. Every
target pair and failed attempt remains visible; partial measurements and
undefined trends receive explicit reasons. Invalid input exits nonzero without
printing the source record.

The report is deterministic for a fixed input and includes the protocol
version, paired-bootstrap seed and replicate count. Use only committed,
locked records for a real report. Unit and CLI tests use synthetic records and
are not AlgZoo pilot data or scientific results. Do not collect or infer model
outcomes while validating the command.
