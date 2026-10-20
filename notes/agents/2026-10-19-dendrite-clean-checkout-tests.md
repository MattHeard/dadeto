# Dendrite clean-checkout artifact tests

## Loop contract and result

Hypothesis: the Google-auth source-contract test has an implicit dependency on
copied `infra/browser` output; separating source assertions from package-output
verification and exercising the copier in temporary filesystem fixtures makes
clean-checkout behavior explicit.

The source-contract test no longer reads `infra/browser`. The Dendrite copier
tests now include a positive fixture that starts without deployment output and
checks recursively copied browser/core files, plus a negative fixture that
omits both source trees and verifies that no deployment output is created.

## Evidence

- Focused Jest suites passed with `infra/browser` temporarily absent: 2 suites,
  8 tests. The directory was restored after the run.
- `npm run build:dendritestories-co-nz` exited successfully. The build refreshed
  checked-in deployment copies from current source; those generated changes
  were restored because syncing deployment output is outside this test-only
  loop.
- `npm run check` passed: all five impact-test shards and all 10 static gates;
  6,523 tests passed in the impact shards. This check does not measure global
  coverage.
- `git diff --check` passed.

## Retrospective

Unexpected hurdle: the package build refreshes a broad set of checked-in
`infra/browser` files, while the clean-checkout test change only needs to
verify the copier's behavior.

Diagnosis: `npm run build:dendritestories-co-nz` invokes the real copy workflow;
the focused test also confirmed the source-contract suite passes when the
generated browser directory is absent.

Next-time guidance: use isolated temporary filesystem fixtures to test the
copy mapping. Treat a broad generated-output refresh as a separate packaging
change and preserve any unrelated worktree files.
