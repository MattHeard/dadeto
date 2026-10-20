# AlgZoo checkpoint lineage

## Unexpected hurdle

The published second-argmax checkpoint objects could not be fetched from this environment: shell access to Google Cloud Storage failed DNS resolution, and the browser connector could not open the public bucket metadata endpoint.

## Diagnosis

The pinned model revision identifies the source repository revision, not the checkpoint weights. Existing lineage coverage changed that source revision to simulate another checkpoint, so it did not prove that snapshots from one training run could share a stable neuron coordinate while retaining distinct weight hashes and progress metadata.

## Chosen fix

Pinned models now accept optional strict checkpoint metadata containing a SHA-256, a required training-run ID, and optional training-progress metric/value. Checkpoint-specific component and circuit identities include the run ID and checkpoint hash. Longitudinal coordinates include the run ID but omit the checkpoint hash. A portable V3 round-trip test preserves twelve synthetic checkpoint hashes and training-sequence progress values, and keeps a second synthetic training run distinct. The synthetic hashes are test data; no published checkpoint hash was asserted.

## Next-time guidance

Treat repository revision, training-run identity, checkpoint SHA-256, and progress as separate facts. Always include a stable training-run ID with checkpoint metadata. Replace or augment the synthetic fixture only after the published checkpoint objects or independently verifiable hashes are available; then record actual artifact hashes and verify the 12-snapshot lineage against those artifacts before marking that spec criterion done.
