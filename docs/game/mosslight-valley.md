# Mosslight Valley

Mosslight Valley is an original handheld RPG episode combining village life, farming, fishing, surreal dialogue, exploration, and turn-based battles.

## Module contract

The game is intentionally split into small browser-core modules:

| Module | Responsibility |
| --- | --- |
| `content` | Maps, actors, items, quests, creatures, and dialogue data |
| `input` | Keyboard action normalization and edge-triggered input |
| `world` | Grid movement, collision, map bounds, time, and seasons |
| `actors` | NPC lookup, facing, and animation state |
| `dialogue` | Dialogue lifecycle and current line selection |
| `simulation` | Farming, fishing, inventory, quests, and battle progression |
| `renderer` | 160×144 pixel-art frame payloads for the canvas presenter |
| `save` | Versioned local persistence plus import/export |
| `audio` | Runtime audio event boundary |
| `runtime` | Composition, stepping, saving, and frame production |
| `mosslightValley` | Dadeto toy adapter: string input to JSON frame output |

The authoritative simulation is synchronous and deterministic. The full-screen presenter and embedded toy must consume the same runtime and content modules.

## Current playable slice

The foundation includes a village grid, collision, player movement, NPC dialogue, item collection, quest completion, a dungeon encounter, turn-based battle resolution, persistent saves, audio event hooks, and a canvas-compatible frame payload.

The next slice should add the dedicated DOM presenter, map transitions, real farming/fishing interaction screens, authored sprites, and richer content.
