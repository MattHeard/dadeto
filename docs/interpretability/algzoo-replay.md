# Reproduce a pinned AlgZoo activation trace

Generate a deterministic standard-normal input sequence and its complete
time-major M16,10 hidden-state trace from a 32-bit seed:

```sh
npm run interpretability:algzoo:replay-activation-trace -- 12345
```

The JSON output records the seed, generated ten-value input, pinned model source
revision and checkpoint digest, and all 16 ReLU activations at each of 10 time
steps. Repeating the command with the same seed and checked-in fixture produces
the same JSON. The command rejects malformed seeds, tensor shapes, non-finite
values, or a fixture with a different model identity without writing partial
output.

This command reproduces one local fixture calculation. Its output is labeled
`deterministic-replay-only`; it is not an assigned pilot target, held-out score,
causal result, or scientific finding. Do not use it as evidence that the
preregistered experiment has run.
