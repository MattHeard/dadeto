#!/usr/bin/env python3
"""A new coordination experiment authored with the unchanged generic scene protocol."""
import argparse
import json
import uuid
import intuition as bridge
from theseus import box, object_spec, effect


def experiment(revision, bonus=4):
    if bonus not in (4, 6):
        raise ValueError("This authored contrast compares rewards 4 and 6")
    objects = [object_spec("hunt-stage", "Coordination: risky cooperation or a safer option", "This small model offers two choices to each party. The displayed rewards are stipulated assumptions, not measurements of human behavior. One player can explore both roles or two players can share them.", [box([96, 64, 16], [107, 64, 59], "sandstone")], "assumption")]
    variables = {"hunt-a": 0, "hunt-b": 0, "hunt-score-a": 0, "hunt-score-b": 0, "hunt-resolved": 0}
    controls = {}
    for role, z in (("a", 20), ("b", 30)):
        for choice, x, label in ((1, 99, "cooperate"), (2, 104, "safer option")):
            name = "hunt-" + role + "-" + str(choice)
            controls[role, choice] = name
            objects.append(object_spec(name, role.upper() + ": " + label, "Use once to inspect, then again to choose. Cooperation pays most when both choose it; the safer option avoids a zero reward. These results follow the chosen table, not a prediction about a real person.", [box([x, 65, z], [x + 1, 65, z + 1], "gray_concrete")], "assumption", ("hunt-stage",)))
    for value, x in ((2, 96), (3, 99), (bonus, 102)):
        name = "hunt-score-top" if value == bonus else "hunt-score-" + str(value)
        objects.append(object_spec(name, str(value) + " stipulated points", "Legend: each block of height stands for one point. Rewards are assumptions you can ask Codex to revise.", [box([x, 65, 56], [x + 1, 64 + value, 57], "green_concrete")], "assumption", ("hunt-stage",)))
    objects.append(object_spec("hunt-score-zero", "Zero reward", "No column is drawn for zero points.", [], "assumption", ("hunt-stage",)))
    for role in ("a", "b"):
        objects.append(object_spec("hunt-payoff-" + role, role.upper() + ": reward not yet resolved", "Both choices are needed before displaying the stipulated outcome.", [], "assumption", ("hunt-stage",)))
    objects.append(object_spec("hunt-guide", "Coordination guide", "Point here and /intuition ask choices, outcome, risk, assumptions or limits. The first recorded choice is visible: this exhibit illustrates the payoff structure, not a controlled simultaneous-choice experiment.", [box([99, 65, 49], [100, 66, 50], "gold_block")], "assumption", ("hunt-stage",)))
    rules = []
    rewards = {(1, 1): (bonus, bonus), (1, 2): (0, 3), (2, 1): (3, 0), (2, 2): (2, 2)}
    for role in ("a", "b"):
        other = "b" if role == "a" else "a"
        for choice in (1, 2):
            for partner in (0, 1, 2):
                name = controls[role, choice]
                increments = {"hunt-" + role: choice}
                effects = [effect(name, name, role.upper() + " chose " + ("cooperation" if choice == 1 else "the safer option"), "This party's choice is committed for this run. The other party can still choose if it has not done so.", material="green_concrete" if choice == 1 else "yellow_concrete")]
                if partner:
                    a, b = (choice, partner) if role == "a" else (partner, choice)
                    award_a, award_b = rewards[a, b]
                    increments.update({"hunt-score-a": award_a, "hunt-score-b": award_b, "hunt-resolved": 1})
                    for party, award, x in (("a", award_a, 99), ("b", award_b, 104)):
                        source_x = 102 if award == bonus else 96 if award == 2 else 99
                        source = "hunt-score-zero" if award == 0 else "hunt-score-top" if award == bonus else "hunt-score-" + str(award)
                        effects.append(effect(source, "hunt-payoff-" + party, party.upper() + ": " + str(award) + " stipulated points", "The height records this run's outcome under the declared reward table. It does not predict choices outside this model.", offset=(x - source_x, 0, -16)))
                rules.append({"id": name + "-after-" + str(partner), "trigger": name, "label": "Commit " + role.upper() + " choice", "requires": {"hunt-" + role: 0, "hunt-" + other: partner}, "increments": increments, "effects": effects, "message": "Choices A={hunt-a}, B={hunt-b} (1=cooperate, 2=safer option); resolved={hunt-resolved}; rewards A={hunt-score-a}, B={hunt-score-b}. Rewards follow stipulated assumptions."})
    def topic(text, resolved=False):
        return {"kind": "assumption", "text": text, "requires": {"hunt-resolved": 1} if resolved else {}}
    guide = {"object": "hunt-guide", "role": "Coordination guide", "disclaimer": "A model interpreter, not a prediction of people or a historical figure.", "topics": {
        "choices": topic("Each party can cooperate or take the safer option. Touch a gray choice tile twice. One player can explore both roles; shared players should agree who controls A and B."),
        "outcome": topic("This run records A={hunt-a}, B={hunt-b}; rewards A={hunt-score-a}, B={hunt-score-b}. Columns show those stipulated point totals.", True),
        "risk": topic("Cooperation can earn the larger mutual reward but gets zero if the other party takes the safer option. The safer option earns at least two points in this chosen table. This describes incentives, not a universal account of trust."),
        "assumptions": topic("Both cooperate: " + str(bonus) + " each. One cooperates: that party gets zero and the other gets three. Both take the safer option: two each. Ask Codex to change the mutual reward or the representation while you stay connected."),
        "limits": topic("Choices here are sequential and visible; communication, trust, repeated encounters and real human motives are not simulated. Changing a reward changes this model, not an empirical law. No animal harm is depicted."),
    }}
    return {"version": 1, "id": "hunt-" + uuid.uuid4().hex, "revision": revision, "action": "batch", "objects": objects, "configuration": {"variables": variables, "rules": rules, "guides": [guide]}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mutual-reward", type=int, choices=(4, 6), default=4)
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    root = bridge.root_path()
    context = bridge.read_context(root)
    state = json.loads((root / "state.json").read_text())
    request = experiment(context["revision"], args.mutual_reward)
    if args.preview:
        print(json.dumps(request, indent=2))
        return 0
    if state.get("variables", {}).get("hunt-a", 0) or state.get("variables", {}).get("hunt-b", 0):
        raise ValueError("Existing choices would be reset; author an explicit revision or use undo instead")
    return bridge.wait(root, bridge.publish(root, request), 90)


if __name__ == "__main__":
    main()
