#!/usr/bin/env python3
"""Pi-local projection of persistent semantic guide roles into bounded vanilla NPC routines."""
import argparse
import fcntl
import json
import math
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import time
import intuition as bridge

WORLD = "minecraft:dadeto_tabletop"


def validate(config, state, require_links=True):
    npcs = config.get("npcs")
    if config.get("version") != 1 or not isinstance(npcs, list) or not 1 <= len(npcs) <= 3:
        raise ValueError("NPC config needs version1 and 1..3 NPCs")
    seen = set()
    for npc in npcs:
        name = npc.get("id", "")
        if not re.fullmatch(r"[a-z][a-z0-9-]{0,31}", name) or name in seen:
            raise ValueError("NPC IDs must be unique safe identifiers")
        seen.add(name)
        for key in ("object", "guide"):
            if not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", npc.get(key, "")):
                raise ValueError("NPC needs safe semantic object and guide IDs")
        if require_links and (npc["object"] not in state["objects"] or npc["guide"] not in state.get("guides", {})):
            raise ValueError("NPC must link to existing persistent meaning and guide knowledge")
        for key in ("goal", "disposition"):
            value = npc.get(key)
            if not isinstance(value, str) or not value.strip() or len(value) > 250 or any(ord(c) < 32 or c == "§" for c in value):
                raise ValueError("Invalid NPC " + key)
        period = npc.get("period")
        if not isinstance(period, int) or isinstance(period, bool) or not 5 <= period <= 60:
            raise ValueError("NPC routine period must be5..60 seconds")
        route = npc.get("route")
        if not isinstance(route, list) or not 1 <= len(route) <= 8:
            raise ValueError("NPC route needs1..8 points")
        for point in route:
            if not isinstance(point, list) or len(point) != 3 or any(type(n) is not int for n in point):
                raise ValueError("NPC positions need three integers")
            x, y, z = point
            if not (96 <= x <= 159 and 65 <= y <= 94 and 0 <= z <= 63):
                raise ValueError("NPC route must stay inside the owned lab")
    return npcs


def tag(npc):
    return "dadeto_npc_" + npc["id"].replace("-", "_")


def selector(npc):
    return "@e[type=minecraft:villager,tag=" + tag(npc) + ",limit=1]"


def chunk(point):
    return point[0] // 16, point[2] // 16


def available(point, state):
    x, y, z = point
    occupied = {cell: material for obj in state["objects"].values() for cell, material in obj["blocks"].items()}
    return occupied.get(f"{x},{y-1},{z}", "minecraft:air") != "minecraft:air" and all(occupied.get(f"{x},{h},{z}", "minecraft:air") == "minecraft:air" for h in (y, y + 1))


def near(npc, context):
    x, y, z = npc["route"][0]
    return any(p["world"] == WORLD and math.dist(p["position"], (x, y, z)) <= 32 for p in context["players"])


class Console:
    def __init__(self):
        self.pid = None

    def send(self, command):
        if "\n" in command or "\r" in command or len(command.encode()) > 3500:
            raise ValueError("Console command must be one bounded line")
        if self.pid is None or not Path(f"/proc/{self.pid}/cmdline").exists():
            self.pid = int(subprocess.check_output(["podman", "inspect", "--format", "{{.State.Pid}}", "dadeto-minecraft"], text=True).strip())
        path = f"/proc/{self.pid}/fd/0"
        if self.pid <= 1 or b"paper.jar" not in Path(f"/proc/{self.pid}/cmdline").read_bytes() or not os.readlink(path).startswith("pipe:"):
            self.pid = None
            raise ValueError("Minecraft must have an open private stdin pipe; never send EOF through attach")
        value = (command + "\n").encode()
        fd = os.open(path, os.O_WRONLY | os.O_NONBLOCK)
        try:
            if os.write(fd, value) != len(value):
                raise OSError("Incomplete console write; inspect server before retrying")
        finally:
            os.close(fd)


def display_name(npc, state):
    label = state["guides"][npc["guide"]]["role"] + " · use gold guide"
    return json.dumps({"text": label}, ensure_ascii=True, separators=(",", ":"))


def spawn(npc, state):
    x, y, z = npc["route"][0]
    name = display_name(npc, state)
    nbt = '{NoAI:1b,Invulnerable:1b,PersistenceRequired:1b,Silent:1b,Tags:[' + json.dumps(tag(npc)) + '],CustomName:' + name + ',CustomNameVisible:1b}'
    return f"execute in {WORLD} unless entity {selector(npc)} if block {x} {y} {z} minecraft:air if block {x} {y+1} {z} minecraft:air unless block {x} {y-1} {z} minecraft:air run summon minecraft:villager {x+0.5} {y} {z+0.5} {nbt}"


def move(npc, point):
    x, y, z = point
    return f"execute in {WORLD} if block {x} {y} {z} minecraft:air if block {x} {y+1} {z} minecraft:air unless block {x} {y-1} {z} minecraft:air run tp {selector(npc)} {x+0.5} {y} {z+0.5}"


def atomic(path, value):
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2) + "\n")
    os.replace(temp, path)


def defaults():
    return {"version": 1, "npcs": [
        {"id": "philosopher", "object": "npc-philosopher", "guide": "harbor-guide", "goal": "Help visitors compare identity criteria without declaring one settled.", "disposition": "Patient and inquisitive; explicitly fictional.", "route": [[114, 65, 17], [114, 65, 18]], "period": 8},
        {"id": "coordinator", "object": "npc-coordinator", "guide": "hunt-guide", "goal": "Help visitors distinguish stipulated rewards from predictions of people.", "disposition": "Clear and cautious about the model's limits.", "route": [[101, 65, 49], [102, 65, 49]], "period": 8},
    ]}


def deploy(root):
    state = json.loads((root / "state.json").read_text())
    config = defaults()
    objects = []
    for npc in config["npcs"]:
        guide = state["guides"][npc["guide"]]
        objects.append({"id": npc["object"], "title": guide["role"], "kind": "speculation", "explanation": "A fictional local guide. Goal: " + npc["goal"] + " Disposition: " + npc["disposition"] + " Routine: pace between nearby clear stations when visitors are present. Knowledge/dialogue is linked to the gold guide; no autonomous model inference or historical-person claim.", "relatesTo": [npc["guide"]], "boxes": []})
    import uuid
    request = {"version": 1, "id": "npc-roles-" + uuid.uuid4().hex, "revision": state["revision"], "action": "batch", "objects": objects}
    if bridge.wait(root, bridge.publish(root, request), 60) != 0:
        raise ValueError("Semantic NPC deployment failed; no entity changes attempted")
    validate(config, json.loads((root / "state.json").read_text()))
    atomic(root / "npcs.json", config)


def run(root, once=False, step=0):
    lock = (root / "npcs.lock").open("a+")
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    console = Console()
    config = json.loads((root / "npcs.json").read_text())
    state = json.loads((root / "state.json").read_text())
    npcs = validate(config, state, require_links=False)
    bridge.read_context(root)  # Wait for a live plugin before issuing world commands.
    chunks = sorted({chunk(p) for npc in npcs for p in npc["route"]})
    # A private projection owns only these small lab chunk tickets. Leave tags/entities persistent across worker restarts.
    for x, z in chunks:
        console.send(f"execute in {WORLD} run forceload add {x*16} {z*16}")
    console.send("team add dadeto_guides")
    console.send("team modify dadeto_guides collisionRule never")
    steps = {npc["id"]: step for npc in npcs}
    last_move = {}
    labels = {}
    while True:
        context = bridge.read_context(root)
        state = json.loads((root / "state.json").read_text())
        current = json.loads((root / "npcs.json").read_text())
        npcs = validate(current, state, require_links=False)
        current_ids = {n["id"] for n in npcs}
        for old in config["npcs"]:
            if old["id"] not in current_ids:
                console.send(f"execute in {WORLD} run kill {selector(old)}")
        config = current
        current_chunks = sorted({chunk(p) for npc in npcs for p in npc["route"]})
        for x,z in current_chunks:
            if (x,z) not in chunks: console.send(f"execute in {WORLD} run forceload add {x*16} {z*16}")
        chunks = sorted(set(chunks) | set(current_chunks))
        status = []
        for npc in npcs:
            steps.setdefault(npc["id"], 0)
            if npc["object"] not in state["objects"] or npc["guide"] not in state.get("guides", {}):
                console.send(f"execute in {WORLD} if entity {selector(npc)} run kill {selector(npc)}")
                status.append({"id": npc["id"], "phase": "suspended; meaning removed"})
                continue
            if not available(npc["route"][0], state):
                status.append({"id": npc["id"], "phase": "blocked spawn; no teleport"})
                continue
            console.send(spawn(npc, state))
            member = selector(npc).replace(",limit=1]", ",team=dadeto_guides,limit=1]")
            console.send(f"execute in {WORLD} if entity {selector(npc)} unless entity {member} run team join dadeto_guides {selector(npc)}")
            label = display_name(npc,state)
            if labels.get(npc["id"]) != label:
                console.send(f"execute in {WORLD} run data merge entity {selector(npc)} {{CustomName:{label}}}")
                labels[npc["id"]] = label
            present = near(npc, context)
            if once or (present and time.monotonic()-last_move.get(npc["id"],0) >= npc["period"]):
                point = npc["route"][steps[npc["id"]] % len(npc["route"])]
                if available(point, state):
                    console.send(move(npc, point))
                    steps[npc["id"]] += 1
                    last_move[npc["id"]] = time.monotonic()
                console.send(f"execute in {WORLD} as {selector(npc)} at @s if entity @p[distance=..12] run tp @s ~ ~ ~ facing entity @p[distance=..12,sort=nearest,limit=1] eyes")
            status.append({"id": npc["id"], "phase": "manual probe" if once else "routine" if present else "paused; no nearby visitor", "step": steps[npc["id"]], "role": state["guides"][npc["guide"]]["role"], "goal": npc["goal"], "guide": npc["guide"]})
        atomic(root / "npcs-status.json", {"updatedAt": time.time(), "pid": os.getpid(), "npcs": status, "chunks": chunks})
        if once:
            for npc in npcs:
                console.send(f"execute in {WORLD} run data get entity {selector(npc)}")
            return
        time.sleep(5)


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("deploy", "start", "run", "once", "status", "stop"))
    parser.add_argument("--step", type=int, choices=range(8), default=0, help="Select a route point for the opt-in once probe")
    args = parser.parse_args()
    root = bridge.root_path()
    pid_file = root / "npcs.pid"
    if args.command == "deploy":
        deploy(root)
    elif args.command in ("run", "once"):
        run(root, args.command == "once", args.step)
    elif args.command == "status":
        print((root / "npcs-status.json").read_text())
    elif args.command in ("start", "stop") and (Path.home() / ".config/systemd/user/dadeto-intuition-npcs.service").exists():
        subprocess.run(["systemctl", "--user", args.command, "dadeto-intuition-npcs.service"], check=True)
        print("User service " + args.command + " requested")
    elif args.command == "start":
        if pid_file.exists():
            pid = int(pid_file.read_text())
            try:
                if b"npc_guides.py" in Path(f"/proc/{pid}/cmdline").read_bytes():
                    print("NPC worker already running: " + str(pid))
                    return
            except FileNotFoundError:
                pass
        log = (root / "npcs-worker.log").open("a")
        process = subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "run"], start_new_session=True, stdout=log, stderr=subprocess.STDOUT)
        pid_file.write_text(str(process.pid))
        print("Started local NPC worker " + str(process.pid))
    else:
        if pid_file.exists():
            pid = int(pid_file.read_text())
            try:
                if b"npc_guides.py" not in Path(f"/proc/{pid}/cmdline").read_bytes():
                    raise ValueError("PID no longer belongs to NPC worker; refusing to signal")
                os.kill(pid, signal.SIGTERM)
            except FileNotFoundError:
                pass
            pid_file.unlink()
        print("Worker stopped; tagged NPCs and chunk tickets preserved. Use explicit cleanup after inspecting ownership.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        sys.exit(str(error))
