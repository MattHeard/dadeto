#!/usr/bin/env bash
set -euo pipefail
umask 077
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source "$HERE/versions.env"
DATA=${MINECRAFT_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft}
NAME=dadeto-minecraft

running() {
  [[ $(podman inspect --format '{{.State.Running}}' "$NAME" 2>/dev/null || true) == true ]]
}

fetch() {
  local url=$1 checksum=$2 destination=$3
  if ! printf '%s  %s\n' "$checksum" "$destination" | sha256sum --check --status; then
    curl --fail --location --retry 2 --max-time 180 --user-agent \
      'dadeto-minecraft-lan/1.0 (https://github.com/MattHeard/dadeto)' \
      "$url" --output "$destination.download"
    printf '%s  %s\n' "$checksum" "$destination.download" | sha256sum --check
    mv -- "$destination.download" "$destination"
  fi
}

setup() {
  [[ ${MINECRAFT_ACCEPT_EULA:-} == true ]] || {
    echo 'Read https://aka.ms/MinecraftEULA then set MINECRAFT_ACCEPT_EULA=true.' >&2; exit 1;
  }
  local address=${MINECRAFT_LAN_IP:?Set MINECRAFT_LAN_IP to the host private IPv4 address}
  python3 - "$address" <<'PY'
import ipaddress, sys
ip = ipaddress.IPv4Address(sys.argv[1])
ranges = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']
if not any(ip in ipaddress.IPv4Network(n) for n in ranges):
    sys.exit('MINECRAFT_LAN_IP must be an RFC1918 private IPv4 address')
PY
  if [[ -e "$DATA/server.properties" ]]; then
    echo "Existing configuration preserved at $DATA; use start or edit it while stopped." >&2
    exit 1
  fi
  mkdir -p "$DATA/plugins/Geyser-Spigot"
  chmod 700 "$DATA"
  fetch "$PAPER_URL" "$PAPER_SHA256" "$DATA/paper.jar"
  fetch "$GEYSER_URL" "$GEYSER_SHA256" "$DATA/plugins/Geyser-Spigot.jar"
  fetch "$FLOODGATE_URL" "$FLOODGATE_SHA256" "$DATA/plugins/floodgate-spigot.jar"
  podman pull "$JAVA_IMAGE"
  sed "s/@LAN_IP@/$address/g" "$HERE/server.properties" > "$DATA/server.properties"
  sed "s/@LAN_IP@/$address/g" "$HERE/geyser.yml" > "$DATA/plugins/Geyser-Spigot/config.yml"
  printf 'eula=true\n' > "$DATA/eula.txt"
  echo "Prepared $DATA. Run $0 start."
}

geyser_checksum() {
  if [[ ! -f "$DATA/geyser-lan-build.json" ]]; then printf '%s' "$GEYSER_SHA256"; return; fi
  python3 - "$DATA/geyser-lan-build.json" "$GEYSER_LAN_COMMIT" <<'PYTHON'
import json, re, sys
with open(sys.argv[1]) as source:
    record = json.load(source)
if record.get('commit') != sys.argv[2] or not re.fullmatch('[0-9a-f]{64}', record.get('sha256', '')):
    sys.exit('Invalid or unrecognized experimental Geyser build record')
print(record['sha256'])
PYTHON
}

start() {
  if running; then echo "$NAME is already running"; return; fi
  [[ -f "$DATA/eula.txt" && -f "$DATA/server.properties" ]] || { echo 'Run setup first' >&2; exit 1; }
  printf '%s  %s\n' "$PAPER_SHA256" "$DATA/paper.jar" \
    "$(geyser_checksum)" "$DATA/plugins/Geyser-Spigot.jar" \
    "$FLOODGATE_SHA256" "$DATA/plugins/floodgate-spigot.jar" | sha256sum --check
  if podman container exists "$NAME"; then podman start "$NAME"; return; fi
  podman run -di --name "$NAME" --network=host --cgroups=disabled \
    --userns=keep-id --user "$(id -u):$(id -g)" --pids-limit=-1 \
    --cap-drop=all --security-opt=no-new-privileges \
    -v "$DATA:/data" -w /data "$JAVA_IMAGE" \
    java -Xms256M -Xmx1200M -XX:ActiveProcessorCount=2 -jar paper.jar --nogui
}

case ${1:-help} in
  setup) setup ;;
  start) start ;;
  stop) podman stop --time 120 "$NAME" ;;
  logs) podman logs --tail 80 --follow "$NAME" ;;
  console) podman attach --sig-proxy=false "$NAME" ;;
  status) podman ps -a --filter "name=^$NAME$"; podman port "$NAME" ;;
  backup)
    if running; then echo 'Stop the server before taking a consistent backup.' >&2; exit 1; fi
    mkdir -p "$(dirname -- "$DATA")/minecraft-backups"
    tar -C "$DATA" -czf "$(dirname -- "$DATA")/minecraft-backups/$(date -u +%Y%m%dT%H%M%SZ).tar.gz" .
    ;;
  *) echo "Usage: $0 {setup|start|stop|logs|console|status|backup}" ;;
esac
