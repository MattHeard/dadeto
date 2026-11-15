#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$HERE/versions.env"
DATA=${MINECRAFT_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft}
python3 "$HERE/ironman/make_skin.py" "$HERE/ironman/build/ironman.png"
podman run --rm --network=none --cgroups=disabled --pids-limit=-1 --userns=keep-id \
  --user "$(id -u):$(id -g)" --cap-drop=all --security-opt=no-new-privileges \
  -v "$HERE/ironman:/work" -v "$DATA:/data:ro" -w /work "$JAVA_BUILD_IMAGE" \
  sh -ec 'classpath=$(find /data/libraries -name "*.jar" -printf "%p:")/data/plugins/Geyser-Spigot.jar; mkdir -p build/classes; javac -cp "$classpath" -d build/classes java/*.java; java -cp "build/classes:$classpath" net.mattheard.ironman.BuildPlanCheck; jar --create --file build/DadetoIronMan.jar -C build/classes . -C build ironman.png plugin.yml config.yml'
echo "Built $HERE/ironman/build/DadetoIronMan.jar"
