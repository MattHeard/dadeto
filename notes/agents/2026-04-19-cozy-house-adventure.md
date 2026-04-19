# 2026-04-19 — Cozy house adventure toy + check cleanup

- Unexpected hurdle: creating a new text-adventure toy by cloning the cyberpunk file would risk triggering duplication checks in `npm run check`.
- Diagnosis path: reviewed current toy and check scripts, then designed a smaller state machine with distinct command flow and wording.
- Chosen fix: implemented a fresh `cozyHouseAdventure` module with lightweight handlers and added focused Jest coverage for progression, completion, random flavor line, and dependency errors.
- Next-time guidance: for “similar toy” requests, prefer reusing the same interface contract while changing structure and command vocabulary to keep duplication tooling green.
