#!/usr/bin/env python3
"""Opt-in integration acceptance. Requires an empty lab (revision 0), never edits the house."""
import copy
import json
from pathlib import Path
import sys
import time
import uuid
import intuition as bridge


def main():
    root = bridge.root_path()
    if bridge.read_context(root)["revision"] != 0:
        sys.exit("Live integration check requires an empty revision-0 lab; use a disposable server after the first run")
    revision = 0
    prefix = "check-" + uuid.uuid4().hex[:8]

    def send(action="put", obj=None, expected="completed", override=None, cancel=False):
        nonlocal revision
        job = {"version": 1, "id": prefix + "-" + uuid.uuid4().hex[:8], "revision": revision, "action": action}
        if obj is not None:
            job["object"] = obj
        if override:
            job.update(override)
        name = bridge.publish(root, job)
        if cancel:
            (root / "inbox" / (name + ".cancel")).touch()
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            path = root / "results" / (name + ".json")
            if path.exists():
                result = json.loads(path.read_text())
                if result["status"] in ("completed", "cancelled", "rejected"):
                    assert result["status"] == expected, result
                    print(json.dumps(result), flush=True)
                    if expected == "completed":
                        revision += 1
                        state = json.loads((root / "state.json").read_text())
                        assert state["revision"] == revision and state["lastJob"] == name
                    return
            time.sleep(0.1)
        raise AssertionError("No terminal result: " + name)

    probe = {"id": "revision-sample", "title": "Reversible plank sample", "kind": "metaphor", "explanation": "These planks are a live editing test: changing material does not settle questions of identity.", "boxes": [{"from": [98, 65, 2], "to": [99, 65, 3], "material": "oak_planks"}]}
    send(obj=probe)
    changed = copy.deepcopy(probe)
    changed["boxes"][0]["material"] = "gold_block"
    changed["explanation"] = "A contrasting material: this is a stipulated representation, not a conclusion about identity."
    send(obj=changed)
    send(action="undo")
    state = json.loads((root / "state.json").read_text())
    assert state["objects"]["revision-sample"]["explanation"] == probe["explanation"]
    assert set(state["objects"]["revision-sample"]["blocks"].values()) == {"minecraft:oak_planks"}
    send(obj=changed, expected="rejected", override={"revision": 0})
    collision = copy.deepcopy(probe)
    collision["id"] = "overlapping-object"
    send(obj=collision, expected="rejected")
    outside = copy.deepcopy(probe)
    outside["boxes"][0]["from"] = [0, 65, 2]
    send(obj=outside, expected="rejected")
    large = copy.deepcopy(probe)
    large["id"] = "cancel-sample"
    large["boxes"] = [{"from": [144, 64, 0], "to": [159, 79, 15], "material": "blue_concrete"}]
    send(obj=large, expected="cancelled", cancel=True)
    state = json.loads((root / "state.json").read_text())
    assert state["revision"] == revision and "cancel-sample" not in state["objects"]
    assert not (root / "pending.json").exists()
    print("PASS: live create, material/meaning revision, undo, stale revision rejection, ownership collision rejection, house bounds rejection, cancellation rollback and durable semantic state")


if __name__ == "__main__":
    main()
