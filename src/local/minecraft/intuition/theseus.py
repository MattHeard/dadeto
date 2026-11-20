#!/usr/bin/env python3
"""Author the Theseus experiment as generic scene data; contains no server/plugin logic."""
import argparse
import json
import uuid
import intuition as bridge


def box(start, end, material):
    return {"from": start, "to": end, "material": material}


def object_spec(name, title, explanation, boxes, kind="metaphor", links=()):
    return {"id": name, "title": title, "explanation": explanation, "kind": kind, "relatesTo": list(links), "boxes": boxes}


def effect(source, target, title, explanation, material=None, offset=(0, 0, 0)):
    result = {"source": source, "target": target, "offset": list(offset), "title": title, "explanation": explanation, "kind": "assumption"}
    if material:
        result["material"] = material
    return result


def experiment(revision, state):
    objects = [
        object_spec("harbor-ground", "A stage for comparing identity", "This harbor is a diagram. Its eight colored panels stand in for all the material parts being considered; the black outline, mast and sail are diagram furniture, not additional untracked parts.", [box([108, 64, 12], [147, 64, 57], "stone_bricks")], "assumption"),
        object_spec("harbor-water", "Harbor diagram", "Blue blocks represent water; this depiction has no currents, weather, or simulated ship physics.", [box([112, 65, 22], [143, 65, 55], "blue_concrete")]),
        object_spec("theseus-hull", "Ship A: continuously maintained", "The black silhouette marks one continuously maintained ship. Only the eight deck panels represent the material parts in this simplified experiment. Use a panel twice to replace it and recover its original.", [box([136, 66, 28], [137, 66, 35], "black_concrete"), box([138, 66, 30], [139, 66, 33], "black_concrete"), box([118, 66, 30], [119, 66, 33], "black_concrete")], links=("harbor-pier",)),
        object_spec("theseus-reconstruction", "Ship B: reassembled originals", "Original components appear here as you remove them from Ship A. Provenance records retain which original part each recovered component came from. The outline alone contains no recovered material.", [box([136, 66, 44], [137, 66, 51], "black_concrete"), box([138, 66, 46], [139, 66, 49], "black_concrete"), box([118, 66, 46], [119, 66, 49], "black_concrete")], links=("theseus-hull",)),
        object_spec("theseus-mast", "Diagram marker: Ship A", "The gray mast and white sail make the drawing recognizable. They are outside the eight-part material accounting, so replacing all means all eight modeled components, not every decorative block.", [box([128, 67, 31], [128, 74, 31], "gray_concrete")], "assumption", ("theseus-hull",)),
        object_spec("theseus-sail", "A recognizable shape", "Keeping a recognizable form is a stipulated aid for following continuity. Appearance does not prove identity.", [box([129, 70, 31], [134, 74, 31], "white_concrete")], "assumption", ("theseus-hull",)),
        object_spec("reconstruction-mast", "Diagram marker: Ship B", "This marker helps compare the two representations. The recovered panels below, rather than this decorative marker, carry original-material provenance.", [box([128, 67, 47], [128, 74, 47], "gray_concrete"), box([129, 70, 47], [134, 74, 47], "white_concrete")], "assumption", ("theseus-reconstruction",)),
        object_spec("harbor-guide", "Harbor philosopher: compare the ships", "Point here and use /intuition ask identity, materials, continuity, function, compare, or all-replaced. No answer is presented as settled. Ask Codex for a new contrast or interpretation while you remain connected.", [box([116, 66, 17], [117, 67, 18], "gold_block")], "speculation", ("theseus-hull", "theseus-reconstruction")),
    ]
    variables = {"replaced": 0, "total-parts": 8}
    rules = []
    for index in range(8):
        name = "panel-" + str(index + 1)
        recovered = "original-" + str(index + 1)
        x, z = 120 + (index % 4) * 4, 28 + (index // 4) * 4
        variables[name + "-done"] = 0
        objects.append(object_spec(name, "Original component " + str(index + 1), "One of eight modeled original components. Use once to inspect and again within ten seconds to replace it; its original material is reconstructed on Ship B.", [box([x, 66, z], [x + 3, 66, z + 3], "oak_planks")], "assumption", ("theseus-hull",)))
        if recovered in state.get("objects", {}):
            objects.append(object_spec(recovered, "Original component not yet removed", "Reset experiment: this original has not yet been removed from Ship A.", [], "assumption", (name,)))
        rules.append({"id": "replace-" + str(index + 1), "trigger": name, "label": "Replace component " + str(index + 1), "requires": {name + "-done": 0}, "increments": {name + "-done": 1, "replaced": 1}, "effects": [
            effect(name, recovered, "Recovered original " + str(index + 1), "This is the recorded original material removed from Ship A, reassembled on Ship B. Its provenance is linked to its original component ID.", offset=(0, 0, 16)),
            effect(name, name, "Replacement component " + str(index + 1), "A new spruce component occupies the original role in Ship A. Continuity of role and continuity of material are different criteria.", material="spruce_planks"),
        ], "message": "Replaced {replaced}/{total-parts}; Ship B now has {replaced} recovered originals. A material count is not itself a verdict about identity."})
    def topic(text, requires=None):
        return {"kind": "speculation", "text": text, "requires": requires or {}}
    guide = {"object": "harbor-guide", "role": "Harbor philosopher", "disclaimer": "An invented guide offering interpretations, not historical quotations or a settled philosophical answer.", "topics": {
        "identity": topic("You have replaced {replaced}/{total-parts} modeled parts. Which criterion do you mean by same: uninterrupted history, original matter, form, function, or something else? Different criteria can favor different ships."),
        "materials": topic("Ship B has {replaced} recovered original components. If original material is decisive, rebuilding those components may favor B. That conclusion assumes a material criterion; the blocks do not prove that criterion."),
        "continuity": topic("Ship A has remained in one place while receiving {replaced} replacements. A continuity criterion may favor A even when no original modeled component remains. That rests on valuing its continuous history."),
        "function": topic("Suppose both ships could perform the same job. Functional equivalence alone might not establish numerical identity: two things can do the same job. This scene does not simulate seaworthiness."),
        "compare": topic("Compare A's continuous maintenance with B's recovered materials ({replaced}/{total-parts}). Explain which criterion you chose before declaring a winner. Ask Codex to build another representation if these criteria miss your question."),
        "all-replaced": topic("All eight modeled components are replaced. A retains continuous maintenance; B contains the originals. The same facts can support opposing conclusions under different identity criteria. Ask Codex to show a contrasting representation; neither criterion is settled by the visualization.", {"replaced": 8}),
    }}
    return {"version": 1, "id": "theseus-" + uuid.uuid4().hex, "revision": revision, "action": "batch", "objects": objects, "configuration": {"variables": variables, "rules": rules, "guides": [guide]}}


def challenge(revision):
    return {"version": 1, "id": "contrast-" + uuid.uuid4().hex, "revision": revision, "action": "batch", "objects": [
        object_spec("continuity-contrast", "Criterion 1: follow a continuous history", "The gold path joins the positions of A and B for comparison. Following Ship A's uninterrupted history is one stipulated criterion. This path represents an argument, not evidence that the argument is correct.", [box([145, 66, 28], [146, 66, 51], "gold_block")], "assumption", ("theseus-hull", "theseus-reconstruction")),
        object_spec("material-contrast", "Criterion 2: follow original materials", "The white marker beside reconstructed Ship B highlights a competing material criterion. Contrast it with A's continuous history. Preserving form or function suggests further questions rather than a single forced answer.", [box([120, 67, 54], [135, 67, 55], "white_concrete")], "assumption", ("theseus-reconstruction",)),
    ]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("deploy", "contrast"))
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    root = bridge.root_path()
    context = bridge.read_context(root)
    state = json.loads((root / "state.json").read_text())
    if args.command == "contrast" and state.get("variables", {}).get("replaced") != 8:
        raise ValueError("Complete all eight replacements before adding the contrasting representation")
    request = experiment(context["revision"], state) if args.command == "deploy" else challenge(context["revision"])
    if args.preview:
        print(json.dumps(request, indent=2))
        return 0
    if args.command == "deploy" and state.get("variables", {}).get("replaced", 0) != 0:
        raise ValueError("Deployment would reset existing progress; restore a starting snapshot or author an explicit revision instead")
    return bridge.wait(root, bridge.publish(root, request), 120)


if __name__ == "__main__":
    main()
