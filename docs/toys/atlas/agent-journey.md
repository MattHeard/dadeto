# Atlas local agent journey

The local journey composes candidate discovery, a complete bounded context
snapshot, evidence-sensitive design drafting, and atomic design submission. It
does not accept a mechanism ID from the caller: discovery selects the candidate
from the validated bundle. A design remains proposed and untested; this command
does not run a provider, perform inference, or call GCP.

## Run

Provide a portable Atlas research bundle and author attribution:

```sh
npm run interpretability:atlas:journey -- \
  --bundle .tmp/atlas/research-bundle.json \
  --author-id local-researcher
```

Optional flags set `--design-id`, `--agent-id`, and `--created-at`. If omitted,
the local adapter supplies a random design ID and current timestamp. The command
prints one machine-readable JSON result; a refusal exits nonzero with a stable
error code and candidate-specific reasons.

Discovery examines at most 100 candidates. Each candidate context is read as a
stable snapshot in pages of 100, with a 1,000-item total bound. Incomplete,
capped, changing, or unreadable context is rejected. The file adapter
serializes concurrent writes with a cross-process lock, validates the bundle,
appends the proposed design to V7, writes through a same-directory temporary
file, and atomically renames it. Only the supplied local bundle file is
modified.

## Test boundary

The journey and storage cores receive storage, filesystem, lock, digest, clock,
identity, and effect-boundary functions as dependencies. Jest uses the
repository's `createTestZod` schemas; those tests do not import or require the
runtime `zod` package. The executable entry point creates real schemas with
Zod, then injects them into the local journey.

Focused regression: `test/core/interpretability/evidenceReuseRoundTrip.test.js`.

## Billing and GCP boundary

This command is a local, unbilled research workflow over a caller-supplied
portable bundle. It does not expose a hosted Atlas operation, read/write
Firestore, or invoke a Cloud Function, so it does not reserve or settle
credits. No Firestore adapter is provided in this slice. A future billable
hosted operation must reuse the existing protocol in
`src/core/cloud/billing/operation-billing-core.js`,
`src/core/cloud/billing/billing-protocol-core.js`, and
`src/core/cloud/billing/pricing-core.js`, with the GCP effect adapters under
`src/cloud/billing/`; it must not add a separate charge path. The pure Atlas
journey remains independent of those cloud modules.
