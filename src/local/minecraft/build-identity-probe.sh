#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$HERE/versions.env"
DATA=${MINECRAFT_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft}
podman run --rm --network=none --cgroups=disabled --pids-limit=-1 \
  --userns=keep-id --user "$(id -u):$(id -g)" \
  --cap-drop=all --security-opt=no-new-privileges \
  -v "$HERE/identity-probe:/work" -v "$DATA:/data:ro" -w /work "$JAVA_BUILD_IMAGE" \
  sh -ec 'classpath=$(find /data/libraries -name "*.jar" -printf "%p:"); mkdir -p classes; javac -cp "$classpath" -d classes IdentityProbe.java; jar --create --file identity-probe.jar -C classes . plugin.yml'
echo "Built $HERE/identity-probe/identity-probe.jar; install only while the server is stopped."
