#!/usr/bin/env python3
"""Build the Bedrock entity pack with classic player geometry and the bundled suit UVs."""

import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from make_skin import png_bytes

IDENTIFIER = "dadeto:survival_iron_man"
GEOMETRY = "geometry.dadeto.survival_iron_man"
WALK = "animation.dadeto.iron_man.walk"

# Bedrock box UVs use the same layout as the classic 64×64 skin.
PARTS = (
    ("head", (0, 24, 0), (-4, 24, -4), (8, 8, 8), (0, 0)),
    ("body", (0, 24, 0), (-4, 12, -2), (8, 12, 4), (16, 16)),
    ("right_arm", (-5, 22, 0), (-8, 12, -2), (4, 12, 4), (40, 16)),
    ("left_arm", (5, 22, 0), (4, 12, -2), (4, 12, 4), (32, 48)),
    ("right_leg", (-2, 12, 0), (-4, 0, -2), (4, 12, 4), (0, 16)),
    ("left_leg", (2, 12, 0), (0, 0, -2), (4, 12, 4), (16, 48)),
)


def documents():
    return {
        "manifest.json": {
            "format_version": 2,
            "header": {
                "name": "Dadeto Iron Man",
                "description": "Survival Iron Man player-shaped suit",
                "uuid": "89976e38-f557-48b1-9b83-7e1a2d4268e9",
                "version": [1, 0, 0],
                "min_engine_version": [1, 21, 0],
            },
            "modules": [{
                "type": "resources",
                "uuid": "6d2e00d8-fc01-4c83-a0a7-4e499261ea73",
                "version": [1, 0, 0],
            }],
        },
        "entity/iron_man.entity.json": {
            "format_version": "1.10.0",
            "minecraft:client_entity": {"description": {
                "identifier": IDENTIFIER,
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/entity/ironman"},
                "geometry": {"default": GEOMETRY},
                "render_controllers": ["controller.render.default"],
                "animations": {"walk": WALK},
                "scripts": {"animate": ["walk"]},
            }},
        },
        "models/entity/iron_man.geo.json": {
            "format_version": "1.12.0",
            "minecraft:geometry": [{
                "description": {
                    "identifier": GEOMETRY, "texture_width": 64, "texture_height": 64,
                    "visible_bounds_width": 2, "visible_bounds_height": 2.5,
                    "visible_bounds_offset": [0, 1, 0],
                },
                "bones": [
                    {"name": name, "pivot": pivot,
                     "cubes": [{"origin": origin, "size": size, "uv": uv}]}
                    for name, pivot, origin, size, uv in PARTS
                ],
            }],
        },
        "animations/iron_man.animation.json": {
            "format_version": "1.8.0",
            "animations": {WALK: {"loop": True, "bones": {
                bone: {"rotation": [f"math.cos(query.modified_distance_moved * 38.17) * "
                                    f"{swing} * math.clamp(query.modified_move_speed, 0, 1)", 0, 0]}
                for bone, swing in (
                    ("right_arm", 30), ("left_arm", -30), ("right_leg", -35), ("left_leg", 35)
                )
            }}},
        },
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.output, "w", compression=ZIP_DEFLATED) as pack:
        for name, document in documents().items():
            pack.writestr(name, json.dumps(document, indent=2))
        pack.writestr("textures/entity/ironman.png", png_bytes())
