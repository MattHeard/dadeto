#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$HERE/../versions.env"
BUILD_ROOT=${MINECRAFT_BUILD_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft-builds/geyser-lan}
[[ $(git -C "$BUILD_ROOT" rev-parse HEAD) == "$GEYSER_LAN_COMMIT" ]] || { echo 'Pinned Geyser checkout required' >&2; exit 1; }
TARGET="$BUILD_ROOT/core/src/test/java/org/geysermc/geyser/skin/IronManSkinTest.java"
[[ ! -e "$TARGET" ]] || { echo 'Existing skin test preserved; refusing overwrite' >&2; exit 1; }
mkdir -p "$(dirname "$TARGET")"
cp "$HERE/tests/IronManSkinTest.java" "$TARGET"
trap 'rm -f -- "$TARGET"' EXIT
python3 "$HERE/make_skin.py" "$HERE/build/ironman.png"
podman run --rm --network=none --cgroups=disabled --pids-limit=-1 \
  --userns=keep-id --user "$(id -u):$(id -g)" --cap-drop=all --security-opt=no-new-privileges \
  -e GRADLE_USER_HOME=/work/.gradle-user -e JAVA_TOOL_OPTIONS=-XX:ActiveProcessorCount=2 \
  -v "$BUILD_ROOT:/work" -v "$HERE:/companion:ro" -w /work "$JAVA_BUILD_IMAGE" \
  ./gradlew --offline --no-daemon --max-workers=1 -Dorg.gradle.parallel=false \
  -Dorg.gradle.jvmargs=-Xmx768m :core:test --rerun --tests '*IronManSkinTest'
