#!/usr/bin/env python3
"""Opt-in Theseus acceptance. Requires no online players and zero prior replacements; resets only this test's progress."""
import json
import time
import uuid
import intuition as bridge
import theseus


def main():
    root = bridge.root_path()
    def saved():
        return json.loads((root / "state.json").read_text())
    start = saved()
    assert start.get("variables", {}).get("replaced") == 0, "Existing player progress; do not reset it"
    assert not bridge.read_context(root)["players"], "Run acceptance before a real session"

    def send(action, expected="completed", **payload):
        current = saved()
        request = {"version": 1, "id": "accept-" + uuid.uuid4().hex, "revision": current["revision"], "action": action, **payload}
        assert not bridge.read_context(root)["players"], "A player joined; stop automated scene testing"
        name = bridge.publish(root, request)
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            path = root / "results" / (name + ".json")
            if path.exists():
                result = json.loads(path.read_text())
                if result["status"] in ("completed", "cancelled", "rejected"):
                    print(json.dumps(result), flush=True)
                    assert result["status"] == expected, result
                    if expected == "completed":
                        assert saved()["revision"] == current["revision"] + 1
                    else:
                        assert saved() == current
                    return
            time.sleep(0.1)
        raise AssertionError("Timed out; inspect result before retrying")

    send("act", rule="replace-1", actor="automated-acceptance")
    once = saved()
    assert once["variables"]["replaced"] == 1
    assert set(once["objects"]["panel-1"]["blocks"].values()) == {"minecraft:spruce_planks"}
    assert set(once["objects"]["original-1"]["blocks"].values()) == {"minecraft:oak_planks"}
    send("act", "rejected", rule="replace-1", actor="automated-acceptance")
    send("undo")
    assert saved()["variables"]["replaced"] == 0 and "original-1" not in saved()["objects"]
    send("undo")
    assert saved()["objects"] == once["objects"] and saved()["variables"] == once["variables"]
    for index in range(2, 9):
        send("act", rule="replace-" + str(index), actor="automated-acceptance")
    complete = saved()
    assert complete["variables"]["replaced"] == 8
    for index in range(1, 9):
        source, original = "panel-" + str(index), "original-" + str(index)
        assert complete["variables"][source + "-done"] == 1
        assert set(complete["objects"][source]["blocks"].values()) == {"minecraft:spruce_planks"}
        assert set(complete["objects"][original]["blocks"].values()) == {"minecraft:oak_planks"}
        assert complete["provenance"][original] == source
        assert len(complete["objects"][original]["blocks"]) == 16
    assert complete["guides"]["harbor-guide"]["topics"]["all-replaced"]["requires"] == {"replaced": 8}
    print("PASS: all eight modeled components replaced, 128 original-material blocks reconstructed with provenance; guide state and progress persisted", flush=True)
    contrast = theseus.challenge(complete["revision"])
    send("batch", objects=contrast["objects"])
    assert "continuity-contrast" in saved()["objects"] and saved()["variables"]["replaced"] == 8
    send("undo")
    assert "continuity-contrast" not in saved()["objects"]
    reset = theseus.experiment(saved()["revision"], saved())
    send("batch", objects=reset["objects"], configuration=reset["configuration"])
    final = saved()
    assert final["variables"]["replaced"] == 0
    for index in range(1, 9):
        assert not final["objects"]["original-" + str(index)]["blocks"]
        assert set(final["objects"]["panel-" + str(index)]["blocks"].values()) == {"minecraft:oak_planks"}
    print("PASS: live contrasting representation and undo; initial playable state restored without erasing real-player progress (none existed)")


if __name__ == "__main__":
    main()
