# Agent Retrospective: Symphony bead freshness

- **Unexpected hurdle:** the project note already mentioned planner review and artifact order, but it still did not tell another agent exactly what to do with a stale file-based bead once it crossed the freshness boundary.
- **Diagnosis path:** read the existing Symphony project note, checked the current `beads/open/` and `beads/archive/` scaffold, and reduced the missing guidance to one short lifecycle rule set instead of a broader planning doc.
- **Chosen fix:** added explicit 24-hour freshness, refresh-in-place, archive, and rewrite guidance for the file-based `beads/open/` scaffold directly in the Symphony planner-review section.
- **Next-time guidance:** if the bead file format grows more fields, keep lifecycle policy in the same local doc unless automation or schema changes make a dedicated scaffold doc necessary.
