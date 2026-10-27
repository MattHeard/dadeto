#!/usr/bin/env bash
# Inert runtime rehearsal only. Never invoke Codex or mount real research data.
set -euo pipefail
if [[ $# != 2 || ! $1 =~ ^[a-z0-9./:_-]+@sha256:[0-9a-f]{64}$ ]]; then
  echo 'Usage: bash src/local/interpretability/probe-algzoo-rootless.sh IMAGE@sha256:DIGEST NEW_REPORT_DIRECTORY' >&2
  exit 2
fi
image=$1
report=$2
if [[ $(podman info --format '{{.Host.Security.Rootless}}') != true ]]; then
  echo 'A rootless Podman runtime is required.' >&2
  exit 1
fi
mkdir -- "$report"
report=$(cd -- "$report" && pwd)
version=$(podman --version)
controllers=$(podman info --format '{{json .Host.CgroupControllers}}')
if ! python3 -I - "$image" "$version" "$controllers" > "$report/runtime.json" <<'PYTHON'
import datetime, json, platform, sys
controllers = json.loads(sys.argv[3])
ready = {'cpu', 'memory', 'pids'} <= set(controllers)
print(json.dumps(dict(schemaVersion=1, scope='inert-rootless-rehearsal',
    observedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    image=sys.argv[1], podmanVersion=sys.argv[2], architecture=platform.machine(),
    rootless=True, cgroupControllers=controllers, resourcePreflightPassed=ready,
    scientificLaunchReady=False), indent=2))
if not ready:
    raise SystemExit('Required rootless cpu/memory/pids controllers are unavailable; no container started.')
PYTHON
then
  (cd -- "$report" && sha256sum runtime.json > SHA256SUMS)
  exit 1
fi
podman image inspect "$image" >/dev/null
scratch=$(mktemp -d "${TMPDIR:-/tmp}/dadeto-algzoo-probe.XXXXXX")
name="dadeto-algzoo-probe-${scratch##*.}"
heartbeat_pid=
cleanup() {
  if [[ -n $heartbeat_pid ]]; then
    kill "$heartbeat_pid" 2>/dev/null || true
    wait "$heartbeat_pid" 2>/dev/null || true
    heartbeat_pid=
  fi
  podman rm --force --ignore "$name" >/dev/null
  rm -rf -- "$scratch"
}
trap cleanup EXIT
mkdir "$scratch/inputs" "$scratch/workspace" "$scratch/denied"
printf 'synthetic-allowed-input\n' > "$scratch/inputs/input.txt"
printf 'synthetic-excluded-canary\n' > "$scratch/denied/sentinel.txt"
echo 'Running inert filesystem, environment and network probes...' >&2
(while sleep 3; do echo 'Inert isolation probe still running...' >&2; done) &
heartbeat_pid=$!
ALGZOO_HOST_CANARY=synthetic-host-only HTTP_PROXY=http://192.0.2.1:9 \
  timeout --signal=TERM --kill-after=5s 60s podman run --rm --pull=never --name "$name" --network=none --read-only \
  --userns=keep-id --cap-drop=ALL --security-opt=no-new-privileges \
  --pids-limit=64 --memory=128m --cpus=1 --http-proxy=false --unsetenv-all \
  --env PATH=/usr/local/bin:/usr/bin:/bin --env LANG=C \
  --env "HOST_SENTINEL_PATH=$scratch/denied/sentinel.txt" \
  --volume "$scratch/inputs:/inputs:ro" \
  --volume "$scratch/workspace:/workspace:rw" \
  --workdir /workspace --entrypoint python3 -i "$image" - \
  > "$report/probes.json" <<'PYTHON'
import errno, json, os, pathlib, socket
checks = {}
checks['allowedInputReadable'] = pathlib.Path('/inputs/input.txt').read_text() == 'synthetic-allowed-input\n'
pathlib.Path('/workspace/result.txt').write_text('synthetic-workspace-output\n')
checks['workspaceWritable'] = pathlib.Path('/workspace/result.txt').read_text() == 'synthetic-workspace-output\n'
for key, target in [('inputWriteDenied', '/inputs/input.txt'), ('rootWriteDenied', '/root-write-canary')]:
    try:
        with open(target, 'a') as output:
            output.write('unexpected-write')
        checks[key] = False
    except OSError as error:
        checks[key] = error.errno == errno.EROFS
checks['externalCanaryHidden'] = not pathlib.Path(os.environ['HOST_SENTINEL_PATH']).exists()
checks['hostEnvironmentHidden'] = not any(key in os.environ for key in ['ALGZOO_HOST_CANARY', 'HTTP_PROXY', 'HTTPS_PROXY', 'OPENAI_API_KEY'])
checks['onlyLoopbackInterface'] = socket.if_nameindex() == [(1, 'lo')]
connection = socket.socket()
connection.settimeout(2)
try:
    connection.connect(('192.0.2.1', 9))
    checks['networkDenied'] = False
except OSError as error:
    checks['networkDenied'] = error.errno in [errno.ENETUNREACH, errno.EHOSTUNREACH]
finally:
    connection.close()
print(json.dumps(dict(checks=checks, passed=all(checks.values())), indent=2))
PYTHON
python3 -I - "$report/probes.json" "$scratch" <<'PYTHON'
import json, pathlib, sys
result = json.loads(pathlib.Path(sys.argv[1]).read_text())
required = {'allowedInputReadable', 'workspaceWritable', 'inputWriteDenied', 'rootWriteDenied',
    'externalCanaryHidden', 'hostEnvironmentHidden', 'onlyLoopbackInterface', 'networkDenied'}
assert set(result['checks']) == required and all(value is True for value in result['checks'].values()), 'Isolation probe failed'
assert result['passed'] is True, 'Missing overall pass'
scratch = pathlib.Path(sys.argv[2])
assert (scratch / 'inputs/input.txt').read_text() == 'synthetic-allowed-input\n', 'Host input changed'
assert (scratch / 'denied/sentinel.txt').read_text() == 'synthetic-excluded-canary\n', 'Host sentinel changed'
assert (scratch / 'workspace/result.txt').read_text() == 'synthetic-workspace-output\n', 'Missing host workspace output'
PYTHON
cleanup
if podman container exists "$name"; then
  echo 'Probe container was not removed.' >&2
  exit 1
else
  result=$?
  [[ $result == 1 ]] || exit "$result"
fi
[[ ! -e $scratch ]]
trap - EXIT
printf '{"containerRemoved":true,"scratchRemoved":true}\n' > "$report/cleanup.json"
(cd -- "$report" && sha256sum runtime.json probes.json cleanup.json > SHA256SUMS)
echo 'Inert isolation rehearsal passed; this is not scientific launch evidence.' >&2
