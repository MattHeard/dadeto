#!/usr/bin/env python3
"""Opt-in data-only transfer check, preserving the completed Theseus deployment and any real player progress."""
import hashlib
import itertools
import json
from pathlib import Path
import uuid
import intuition as bridge
import stag_hunt


def main():
    root = bridge.root_path()
    engine = Path(__file__).parents[1] / "tabletop/java"
    def hashes():
        return {name: hashlib.sha256((engine / name).read_bytes()).hexdigest() for name in ("SceneEngine.java", "SceneModel.java", "SceneRules.java")}
    frozen = hashes()
    def saved():
        return json.loads((root / "state.json").read_text())
    original = saved()
    assert original["variables"]["hunt-a"] == 0 and original["variables"]["hunt-b"] == 0
    assert not bridge.read_context(root)["players"]
    others = {k: v for k, v in original["objects"].items() if not k.startswith("hunt-")}
    other_vars = {k: v for k, v in original["variables"].items() if not k.startswith("hunt-")}

    def send(request):
        assert not bridge.read_context(root)["players"], "Player joined: stop automated tests"
        assert bridge.wait(root, bridge.publish(root, request), 90) == 0
        assert {k: v for k, v in saved()["objects"].items() if not k.startswith("hunt-")} == others
        assert {k: v for k, v in saved()["variables"].items() if not k.startswith("hunt-")} == other_vars
        assert hashes() == frozen, "Transfer must not change the engine"

    def choose(role, choice):
        state = saved()
        other = "b" if role == "a" else "a"
        rule = "hunt-" + role + "-" + str(choice) + "-after-" + str(state["variables"]["hunt-" + other])
        send({"version": 1, "id": "transfer-" + uuid.uuid4().hex, "revision": state["revision"], "action": "act", "rule": rule, "actor": "automated-transfer"})

    expected = {(1, 1): (4, 4), (1, 2): (0, 3), (2, 1): (3, 0), (2, 2): (2, 2)}
    for a, b, first in itertools.product((1, 2), (1, 2), ("a", "b")):
        send(stag_hunt.experiment(saved()["revision"], 4))
        for role in (("a", "b") if first == "a" else ("b", "a")):
            choose(role, a if role == "a" else b)
        state = saved()
        scores = expected[a, b]
        assert (state["variables"]["hunt-score-a"], state["variables"]["hunt-score-b"]) == scores
        assert state["variables"]["hunt-resolved"] == 1
        for role, score in zip(("a", "b"), scores):
            assert len(state["objects"]["hunt-payoff-" + role]["blocks"]) == 4 * score
        print(f"PASS: choices A={a},B={b},first={first}; rewards={scores}", flush=True)
    send(stag_hunt.experiment(saved()["revision"], 6))
    choose("a", 1)
    choose("b", 1)
    revised = saved()
    assert revised["variables"]["hunt-score-a"] == revised["variables"]["hunt-score-b"] == 6
    assert len(revised["objects"]["hunt-payoff-a"]["blocks"]) == 24
    assert "6 each" in revised["guides"]["hunt-guide"]["topics"]["assumptions"]["text"]
    send(stag_hunt.experiment(saved()["revision"], 4))
    assert saved()["variables"]["hunt-resolved"] == 0
    print("PASS: reward-assumption revision changes geometry and meanings, all eight order/outcome cases, other scene preserved, engine hashes unchanged; fresh playable state restored")
    print(json.dumps(frozen, sort_keys=True))


if __name__ == "__main__":
    main()
