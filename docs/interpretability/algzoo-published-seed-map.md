# AlgZoo published seed map

Regenerate the portable V3 bundle at `docs/interpretability/algzoo-m16-10-arc-seed-map-v3.json` with:

```sh
node src/local/create-algzoo-seed-map.js
```

The bundle combines the checked-in pinned `M_{16,10}` checkpoint with a deterministic local float32 replay for 16 stable neuron components, their 160 recurrent positions, and 160 input/run-specific observations. It also includes five proposed, ARC-attributed hypotheses for neurons 1, 2, 4, 6, and 7. The selected input is generated from seed 17; the artifact records the input digest and replay run ID.

Each hypothesis retains the [ARC source article](https://www.alignment.org/blog/algzoo-uninterpreted-models-with-fewer-than-1-500-parameters/), the assumptions about rescaled hidden-state units and approximate weight sparsity/isolation, and an explicit statement that the source does not quantify approximation error. The source says the approximation error becomes increasingly significant for more complex neurons. These records remain `proposed`, have no attached independent evidence, and are not verified interpretations.

The five source-described units are the only ones given functional hypotheses. The other eleven component identities remain in the bundle without inferred functions. ARC says most of those units are more densely connected, but does not identify which individual units are dense; the seed map therefore makes no per-unit claim about them. The V3 lineage retains the legacy timestep-specific records while linking them to 16 stable components and separate activation positions.

The focused regression builds the artifact with injected test schemas, compares it to the checked-in bundle, and imports the V3 bundle again. It does not require the installed Zod package, contact ARC, run live inference, or write to a shared service. The activation measurements are local deterministic replays, not measurements reported by ARC and not validation of the published hypotheses.
