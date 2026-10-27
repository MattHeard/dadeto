# Pi rootless isolation rehearsal

This is an inert operating-system rehearsal, not a Codex investigation or
scientific launch gate. It never invokes Codex, reads credentials, mounts the
repository or real Atlas/held-out data, or starts inference. Every mounted file
is a freshly generated synthetic canary. The report must not be entered as the
protocol's live Codex leakage/access-log evidence.

## Observed host and current blocker — 27 October 2026

The host is a Raspberry Pi 5 Model B Rev 1.1, aarch64, Debian 13.4, with
4,146,880 kB RAM. The observed Codex CLI is 0.139.0; only its version was queried,
not authentication or inference. Installed Debian packages: Podman 5.4.2,
uidmap, crun 1.21 and fuse-overlayfs. Existing subordinate UID/GID ranges allow
rootless mode. Podman reports rootless=true, cgroups v2, crun, and delegated
controllers `["cpu", "pids"]`.

**The memory controller is disabled by the running kernel's
`cgroup_disable=memory` boot option.** Root `cgroup.controllers` lists
`cpuset cpu io pids`; root `memory.max` is absent. The first resource-limited
container failed before executing its Python probe with:

```text
crun: opening file `memory.max` for writing: No such file or directory
```

The probe container was removed. No canary check passed in that attempt.
The harness now checks required cpu/memory/pids controllers before creating a
container, retaining sanitized metadata and its hash. Its real second run
returned exit 1: `Required rootless cpu/memory/pids controllers are unavailable;
no container started.` Evidence is in
[runtime-probes/2026-10-27-pi/runtime.json](runtime-probes/2026-10-27-pi/runtime.json)
and the adjacent `SHA256SUMS`. This is failure evidence, not an independently
anchored audit record. Owning Bead: `dadeto-sy41`.

A host operator must remove the memory-disabling option from the active boot
configuration and reboot before this gate can proceed. Neither boot settings nor
the machine's running services were changed for this loop. After reboot, verify
both the kernel and rootless Podman expose memory alongside cpu and pids. Do not
remove the memory limit or silently switch to a privileged/host-network run.

## Reproduce once the resource prerequisite is available

Prepare a public Python image explicitly, then inspect and use its immutable
repository digest. Pulling is an operator setup action outside the no-network
probe. The actual rehearsal uses `--pull=never` and rejects mutable tags.
The observed arm64-capable image for this attempt was:

```text
docker.io/library/python@sha256:4dec53ac220d1cca3d31d40d346e4c2cd3540c1d7eb058ed70a3f94934728cf2
```

Run from the repository with a new report directory (existing directories are
rejected to avoid overwriting evidence):

```sh
bash src/local/interpretability/probe-algzoo-rootless.sh \
  docker.io/library/python@sha256:4dec53ac220d1cca3d31d40d346e4c2cd3540c1d7eb058ed70a3f94934728cf2 \
  /tmp/algzoo-rootless-new-report
```

The rootless container has no network, a read-only root and input mount, one
writable synthetic workspace, no capabilities, no new privileges, no inherited
image/proxy environment, 128 MiB memory, one CPU, 64 PIDs and a 60-second deadline.
It receives neither a Podman socket nor credential directory. A three-second
heartbeat shows progress. It checks positive input/workspace operations,
read-only writes, an excluded host-file canary, host environment exclusion,
loopback-only interfaces and a kernel network-unreachable result for a reserved
TEST-NET address. Failure is nonzero even if a malformed report claims overall
success. Traps remove the named container and scratch files on failure; a
successful run also verifies absence and retains cleanup metadata and hashes.

A successful inert run would still not prove dedicated persistent Codex auth,
restricted Codex-supervisor egress, live Codex canary probes, actual stage/arm
access logs, frozen common inputs, independent audit anchoring or the blinded
rehearsal. Those remain in `codex-investigator-adapter.md` and the preregistration.

## Regression checks

```sh
node scripts/run-jest.js test/scripts/algzoo-rootless-probe.test.js --runInBand --coverage=false
```

These tests use a fake Podman binary: no image, real container, authentication,
reboot or inference is required in unit CI. They prove shell failure/cleanup and
argument behavior, not OS isolation. Official runtime semantics:
[Podman run](https://docs.podman.io/en/latest/markdown/podman-run.1.html)
(`--network=none`, `--http-proxy=false`, resource limits and read-only mounts).
