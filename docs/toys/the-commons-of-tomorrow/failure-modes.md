# Failure Modes — The Commons of Tomorrow

## Initial Predicted Failure Classes

- Shared-runtime assumptions mismatch: game-specific state is interpreted as Mosslight state.
- Invalid or missing inputs: unknown map, dialogue choice, puzzle edit, practice, or charter command.
- Persistence: malformed or foreign save replaces live progress, or local storage is unavailable.
- Replay: fluid puzzle depends on elapsed browser time or changes with presenter frame rate.
- Controller/UI: choice or menu overlay allows hidden movement; 160×144 labels clip.
- Narrative: choice labels hide costs or all routes collapse into a single preferred outcome.

## Detection Signals

- Embedded and standalone snapshots differ after identical action sequences.
- Invalid command changes evidence, agreement or resource state.
- Save import accepts unknown identity/version or partially replaces current state.
- Replay output differs for identical starting puzzle and commands.
- Visible controls or content require a key outside directions/A/B/X/Y.

## First-Response Playbook

1. Capture the exact command sequence and resulting snapshot/frame from both adapters.
2. Isolate authored-content validation, simulation transition, save adapter, or presenter input handling.
3. Add a focused regression at the failing boundary and record command plus outcome in the bead.
4. Preserve a complete route through the game while fixing rendering or convenience features.

## Promoted from Real Failures

- Date: pending implementation.
- Failure observed: none yet.
- Root cause: not applicable.
- Fix implemented: not applicable.
- Guardrail added: acceptance criteria and focused deterministic replay requirements.
