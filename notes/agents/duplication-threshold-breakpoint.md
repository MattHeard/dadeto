# Duplication Threshold Breakpoint

Date: 2026-06-02

## Unexpected Hurdle

Temporary `jscpd` configs resolve scan paths relative to the config file, so a
first sweep from `/tmp` failed by looking for `/tmp/.../src` instead of the repo
`src` directory.

## Diagnosis Path

The persisted `.jscpd.json` threshold was reduced from `minTokens: 41` to
`minTokens: 40`, and `npm run duplication` still reported `0 clones`. A corrected
absolute-path sweep then lowered the value one point at a time.

## Chosen Fix

Keep the repo threshold at the stricter green value, `minTokens: 40`. The first
failing value is `minTokens: 39`, which reports one clone in
`src/core/check-runner.js` between the failure-event paths around lines 124-129
and 149-154.

## Evidence

- `npm run duplication` at `minTokens: 40`: passed with `0 clones`.
- `npm run check` at `minTokens: 40`: passed all 8 checks.
- Exploratory sweep at `minTokens: 39`: found `1 clone`, `0.01%` duplicated
  lines, and `0.02%` duplicated tokens.

## Next-Time Guidance

If we want to lower the threshold to `39`, first extract the repeated
`check-failure` event recording in `src/core/check-runner.js`, then rerun
`npm run duplication` and continue the one-point sweep.
