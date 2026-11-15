#!/usr/bin/env python3
"""Read-only live verification of NPC identity/counts, service recovery and preserved scene state."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import time
import npc_guides as npc
import intuition as bridge


def counts(output):
    return [int(n) for n in re.findall(r"Test passed[.,] [Cc]ount: (\d+)", output)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-state", type=Path)
    args = parser.parse_args()
    root = bridge.root_path()
    assert not bridge.read_context(root)["players"], "Run offline integrity checks while no one is exploring"
    if args.expected_state:
        assert json.loads((root / "state.json").read_text()) == json.loads(args.expected_state.read_text()), "Semantic state changed"
    for _ in range(15):
        active = subprocess.run(["systemctl", "--user", "is-active", "--quiet", "dadeto-intuition-npcs.service"]).returncode == 0
        status = json.loads((root / "npcs-status.json").read_text())
        if active and time.time() - status["updatedAt"] < 10:
            break
        time.sleep(1)
    else:
        raise AssertionError("NPC service did not recover to a fresh active state")
    state = json.loads((root / "state.json").read_text())
    config = json.loads((root / "npcs.json").read_text())
    roster = npc.validate(config, state)
    log = root.parents[2] / "logs/latest.log"
    offset = log.stat().st_size
    console = npc.Console()
    for item in roster:
        console.send(f"execute in {npc.WORLD} run data get entity {npc.selector(item)} UUID")
        console.send(f"execute in {npc.WORLD} if entity @e[type=minecraft:villager,tag={npc.tag(item)}]")
    console.send("intuition verify")
    console.send("tabletop verify")
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        with log.open() as stream:
            stream.seek(offset)
            output = stream.read()
        if len(counts(output)) == len(roster) and "Tabletop verification:" in output:
            break
        time.sleep(0.1)
    else:
        raise AssertionError("Timed out waiting for read-only console verification; inspect logs")
    totals = counts(output)
    assert totals == [1] * len(roster), ("NPC duplication", totals)
    identities = {}
    for item in roster:
        label = state["guides"][item["guide"]]["role"] + " · use gold guide"
        match = re.search(re.escape(label) + r" has the following entity data: (\[I;[^\]]+\])", output)
        assert match, "Missing persisted NPC: " + item["id"]
        identities[item["id"]] = match.group(1)
    assert "Intuition verification: 0 mismatches" in output
    assert "Tabletop verification: 0 mismatches across 33672 placements" in output
    print(output, end="")
    print(json.dumps({"result": "PASS", "revision": state["revision"], "counts": totals, "identities": identities, "service": "active", "semanticStateMatches": bool(args.expected_state)}, sort_keys=True))


if __name__ == "__main__":
    main()
