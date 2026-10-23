# AlgZoo whole-model accuracy report renderer

The evaluator returns a versioned JSON accuracy report after the 32 preregistered
perturbation variants have been measured and validated. Render that stored report
to Markdown with:

```sh
npm run interpretability:algzoo:render-accuracy-report -- path/to/accuracy-report.json
```

The input is the JSON `report` object returned by
`evaluateAlgZooWholeModelAccuracyV1`, not the raw evaluation wrapper. The command
prints only the rendered whole-model accuracy section to standard output. It
checks the stored report shape and refuses missing or malformed inputs without
writing a partial report. Output order is stable and includes the overall
comparison, each perturbation scale, and every variant row.

The report keeps whole-model accuracy separate from local neuron prediction and
causal evidence. It never substitutes zeros for absent data or infers values not
present in the stored record. The current report schema does not carry a
reference-accuracy uncertainty interval; the renderer labels that field as
unavailable instead of estimating one.

Unit-test fixtures are synthetic and are used only to verify formatting and
validation. They are not pilot results. No pilot outcomes are currently
published; create a public results report only from locked, scored study records.
