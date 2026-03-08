# Agent Retrospective: Symphony status interpretation

- **Unexpected hurdle:** the project note already named the right Symphony artifacts, but it still left too much interpretation work to the next planner by not explaining how those artifacts should drive create, refresh, archive, or handoff decisions.
- **Diagnosis path:** checked the current planner-review note, looked at the persisted status fields and queue evidence surfaced by the local Symphony scaffold, and reduced the guidance to the smallest field-level interpretation another agent would need.
- **Chosen fix:** extended the Symphony project note with explicit instructions for reading `tracking/symphony/status.json`, when to inspect `tracking/symphony/runs/`, and how those artifacts inform planner decisions without changing runtime behavior.
- **Next-time guidance:** if planner review keeps needing more nuance, split log interpretation and bead lifecycle policy into separate Symphony doc beads rather than turning the project note into a long operations manual.
