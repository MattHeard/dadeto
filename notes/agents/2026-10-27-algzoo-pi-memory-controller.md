# Pi container memory controller blocks the inert AlgZoo rehearsal

- Unexpected hurdle: the workspace is now a real 4 GB Pi 5 and rootless Podman
  installs successfully, yet crun cannot create the memory-limited container.
- Diagnosis: root `cgroup.controllers` lacks memory, `memory.max` is absent,
  `/proc/cmdline` explicitly includes `cgroup_disable=memory`, and rootless
  Podman exposes only cpu/pids. This is a kernel prerequisite, not an application
  regression or evidence that isolation succeeded.
- Fix: add a digest-pinned synthetic rehearsal with resource preflight, restricted
  mounts/network/environment, deadline, progress, cleanup and fake-runtime tests.
  Retain the real failing preflight and SHA-256 under
  `docs/interpretability/runtime-probes/2026-10-27-pi/`; do not weaken memory limits.
- Next: operator-reviewed boot configuration/reboot, verify delegated memory,
  then rerun the inert harness. Dedicated unattended Codex auth, actual Codex
  canaries/access logs, frozen data, independent audit anchoring and scientific
  rehearsal remain separate. No credentials, Codex investigation, inference or
  held-out data were used. Bead `dadeto-sy41` owns the blocked runtime gate.

## Validation

- Focused command: `node scripts/run-jest.js test/scripts/algzoo-rootless-probe.test.js --runInBand --coverage=false` passed six tests. The report validator also rejects a false check with host `PYTHONOPTIMIZE=1`; isolated host Python ignores that override.
- `npm run check` passed all 10 local gates, six serial unit shards without coverage, zero clones and zero audit vulnerabilities.
- `bash -n src/local/interpretability/probe-algzoo-rootless.sh`, `git diff --check` and retained `sha256sum -c SHA256SUMS` passed.
- The real rootless preflight failed as expected on missing memory; no live isolation success or scientific launch is claimed. Full Check for the resulting pushed commit remains asynchronous evidence.
