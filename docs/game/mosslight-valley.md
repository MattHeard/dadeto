# Mosslight Valley

Mosslight Valley is an original handheld RPG episode combining village life, farming, fishing, surreal dialogue, exploration, and turn-based battles.

## Module contract

The game is intentionally split into small browser-core modules:

| Module            | Responsibility                                                                  |
| ----------------- | ------------------------------------------------------------------------------- |
| `content`         | Maps, actors, items, quests, creatures, and dialogue data                       |
| `input`           | Keyboard, gamepad, and page touch-action normalization                          |
| `world`           | Connected maps, actor/tile collision, camera bounds, time, weather, and seasons |
| `actors`          | NPC lookup, story-sensitive schedules, and animation state                      |
| `dialogue`        | Dialogue lifecycle and current line selection                                   |
| `quests`          | Prerequisites, journal state, remembered events, and ending resolution          |
| `activities`      | Seasonal crop lifecycle, weather/time fishing, resting, waiting, and crafting   |
| `combat`          | Deterministic encounters, enemy intent, skills, guarding, and rewards           |
| `simulation`      | Shared action-to-story rules and persistent world changes                       |
| `renderer`        | 160×144 pixel-art frame payloads for the canvas presenter                       |
| `save`            | Versioned local persistence plus import/export                                  |
| `audio`           | Runtime audio event boundary                                                    |
| `runtime`         | Composition, stepping, saving, and frame production                             |
| `pagePresenter`   | Full-screen keyboard/gamepad/touch lifecycle, canvas, and browser persistence   |
| `mosslightValley` | Synchronous embedded toy adapter to the same JSON frame output                  |

The authoritative simulation is synchronous and deterministic. The full-screen presenter and embedded toy must consume the same runtime and content modules.

## Chapter and play modes

The Sleeping Valley chapter links Mosslight Village, Glasswater Shore, Old Orchard, and the Listening Hollow. The valley’s dreams shape its weather, local memories, and eventual ending. Mira’s trust choice and Vale’s shared garden change later schedules; fragments, farming, fishing, and the Hollow guardian shape what the residents can choose when the Moth Saint asks how the valley should wake.

Play the complete experience at `/mosslight-valley/`; the Dadeto toy is a compact opening-scene preview, both backed by this runtime. The page adapts from desktop to portrait phones and short landscape screens. Touch controls provide movement, talk/confirm, farming, fishing, waiting, journal, battle skill, and guard. Saves remain on-device in three selectable slots with JSON import/export.

For operating scope, known failure modes, and manual playthrough steps, see `docs/toys/mosslight-valley/`.
