#!/usr/bin/env bash
set -euo pipefail
umask 077
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$here/versions.env"
share=${XDG_DATA_HOME:-$HOME/.local/share}/dadeto
renderer=${CHUNKY_DIR:-$share/chunky}
world=${MINECRAFT_DATA_DIR:-$share/minecraft}/world
output=${1:-$PWD/nobles-house.png}
test -s "$renderer/textures.jar"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/world/region" "$work/settings"
cp "$world/level.dat" "$work/world/"
cp "$world/dimensions/minecraft/dadeto_tabletop/region/"r.*.mca "$work/world/region/"
python3 - "$work/house.json" "${HOUSE_VIEW:-tabletop}" <<'PY'
import json
import math
from pathlib import Path
import sys

scene = {
    "name": "house", "width": 800, "height": 720, "sppTarget": 8,
    "yClipMin": 58, "yClipMax": 76,
    "world": {"path": "/scene/world", "dimension": "minecraft:overworld"},
    "chunkList": [[x, z] for x in range(-1, 4) for z in range(-1, 4)],
    "camera": {
        "position": {"x": 22.5, "y": 125, "z": 26.5},
        "orientation": {"yaw": -math.pi / 2, "pitch": 0, "roll": 0},
        "projectionMode": "PARALLEL", "fov": 74,
    },
}
if sys.argv[2] in ("walkthrough", "upstairs", "manor"):
    scene["camera"]["position"]["z"] += 72
    scene["chunkList"] = [[x, z] for x in range(-1, 4) for z in range(3, 9)]
    scene["yClipMax"] = 69  # Cut away the ceiling for the interior inspection.
    if sys.argv[2] == "upstairs":
        scene.update(yClipMin=69, yClipMax=74)
    if sys.argv[2] == "manor":
        eye, target = (-32, 98, 154), (22, 73, 98)
        dx, dy, dz = (b-a for a,b in zip(eye,target))
        scene.update(width=1000, height=700, yClipMax=89)
        scene["camera"] = {
            "position": dict(zip("xyz", eye)),
            "orientation": {
                "yaw": math.atan2(-dz, dx),
                "pitch": math.acos(-dy / math.hypot(dx,dy,dz)),
                "roll": math.pi,
            },
            "projectionMode": "PINHOLE",
            "fov": 54,
        }
elif sys.argv[2] != "tabletop":
    raise SystemExit("HOUSE_VIEW must be tabletop, walkthrough, upstairs or manor")
Path(sys.argv[1]).write_text(json.dumps(scene))
PY
podman run --rm --network=none --userns=keep-id --cpus=1.5 \
  -v "$renderer:/chunky:ro" -v "$work:/scene" "$JAVA_BUILD_IMAGE" \
  java -Xmx768m -Dchunky.home=/scene/settings -cp '/chunky/lib/*' \
  se.llbit.chunky.main.Chunky -texture /chunky/textures.jar -threads 2 \
  -render /scene/house.json -reload-chunks -f
images=("$work"/snapshots/house-*.png)
test -s "${images[-1]}"
cp -- "${images[-1]}" "$output"
printf 'Rendered %s\n' "$output"
