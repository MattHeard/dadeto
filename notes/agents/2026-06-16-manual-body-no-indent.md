# Manual body no-indent — 2026-06-16

- **Unexpected hurdle:** The manual content still inherited a left offset even after the show/hide control moved into the title line, so the expanded block looked unnecessarily inset.
- **Diagnosis path:** Checked the generator styles and confirmed the only remaining offset came from `.manual-body { padding-left: 2ch; }`.
- **Chosen fix:** Removed the manual body left padding from the shared styles and regenerated the public page so the content aligns flush with the entry grid.
- **Next-time guidance:** When a control becomes part of the label, revisit any inherited spacing on the expanded content so the visual rhythm stays consistent.
