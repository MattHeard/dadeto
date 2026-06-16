# Manual inline toggle parentheses — 2026-06-16

- **Unexpected hurdle:** The manual control was technically correct but visually sat away from the title, which made it feel detached from the section header.
- **Diagnosis path:** Compared the rendered manual block to the tag visibility toggle pattern and confirmed the more natural placement is inline after the label, wrapped in parentheses.
- **Chosen fix:** Moved the toggle into the title line, kept it as an in-place state change, and changed the generated markup and tests to expect `User manual (show)` style output.
- **Next-time guidance:** When a control reads like part of a label, prefer inline placement with a small parenthesized affordance instead of a separate control block.
