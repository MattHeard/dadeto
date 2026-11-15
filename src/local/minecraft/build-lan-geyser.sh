#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$HERE/versions.env"
BUILD_ROOT=${MINECRAFT_BUILD_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft-builds/geyser-lan}
if [[ ! -d "$BUILD_ROOT/.git" ]]; then
  [[ ! -e "$BUILD_ROOT" ]] || { echo 'Build directory exists without a Git checkout' >&2; exit 1; }
  git init "$BUILD_ROOT"
  git -C "$BUILD_ROOT" remote add origin https://github.com/bkrabach/Geyser.git
  git -C "$BUILD_ROOT" fetch --depth 1 origin "$GEYSER_LAN_COMMIT"
  git -C "$BUILD_ROOT" checkout --detach "$GEYSER_LAN_COMMIT"
fi
[[ $(git -C "$BUILD_ROOT" rev-parse HEAD) == "$GEYSER_LAN_COMMIT" ]] || {
  echo 'Build checkout does not match the pinned LAN candidate' >&2; exit 1;
}
git -C "$BUILD_ROOT" diff --exit-code HEAD
git -C "$BUILD_ROOT" submodule update --init --recursive
podman run --rm --network=host --cgroups=disabled --pids-limit=-1 \
  --userns=keep-id --user "$(id -u):$(id -g)" \
  --cap-drop=all --security-opt=no-new-privileges \
  -e GRADLE_USER_HOME=/work/.gradle-user -e JAVA_TOOL_OPTIONS=-XX:ActiveProcessorCount=2 \
  -v "$BUILD_ROOT:/work" -w /work "$JAVA_BUILD_IMAGE" \
  ./gradlew --no-daemon --max-workers=1 -Dorg.gradle.parallel=false \
  -Dorg.gradle.jvmargs=-Xmx768m :core:test --tests '*Lan*' \
  --tests '*UnsignedAnswerSignalingTest' :spigot:shadowJar
python3 - "$BUILD_ROOT" "$GEYSER_LAN_COMMIT" <<'PY'
import hashlib, json, pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
jar = root / 'bootstrap/spigot/build/libs/Geyser-Spigot.jar'
with zipfile.ZipFile(jar) as archive:
    for name in ['languages/texts/en_US.properties', 'mappings/blocks.nbt', 'mappings/items.json']:
        if not archive.read(name):
            sys.exit('Empty required Geyser resource: ' + name)
record = {'repository': 'https://github.com/bkrabach/Geyser', 'commit': sys.argv[2],
          'sha256': hashlib.sha256(jar.read_bytes()).hexdigest(),
          'upstreamPR': 'https://github.com/GeyserMC/Geyser/pull/6896'}
manifest = jar.with_name('geyser-lan-build.json')
manifest.write_text(json.dumps(record, indent=2) + '\n')
print('Resource verification passed. Candidate:', jar)
print('Build record:', manifest)
PY
