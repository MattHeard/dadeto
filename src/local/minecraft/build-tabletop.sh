#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$HERE/versions.env"
DATA=${MINECRAFT_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft}
python3 "$HERE/tabletop/compile-map.py" "$HERE/tabletop/build"
podman run --rm --network=none --cgroups=disabled --pids-limit=-1 \
  --userns=keep-id --user "$(id -u):$(id -g)" \
  --cap-drop=all --security-opt=no-new-privileges \
  -v "$HERE/tabletop:/work" -v "$DATA:/data:ro" -w /work "$JAVA_BUILD_IMAGE" \
  sh -ec 'classpath=$(find /data/libraries -name "*.jar" -printf "%p:")/data/plugins/Geyser-Spigot.jar; mkdir -p build/classes; javac -cp "$classpath" -d build/classes java/*.java; java -cp "build/classes:$classpath" net.mattheard.tabletop.SceneModelCheck; jar --create --file build/DadetoTabletop.jar -C build/classes . -C build house.tsv -C build views.tsv -C build walkthrough.tsv -C build walkthrough-v1.tsv -C build walkthrough-v2.tsv plugin.yml config.yml'
echo "Built $HERE/tabletop/build/DadetoTabletop.jar; install only while the server is stopped."
