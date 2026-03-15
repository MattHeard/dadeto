# 2026-03-15: Promote Symphony TUI bead ID prominence

- **Unexpected hurdle:** The compact view previously garbled bead ID and title onto one line, so the ID got lost when long titles wrapped or truncated the label.
- **Diagnosis path:** Reviewed `scripts/symphony-tui.js` and saw `formatField('Bead', 'ID ... - title')` produced one highlighted line.
- **Chosen fix:** Split the display into a bold `Bead ID` line plus a separate `Title` line so the ID hits the visual priority while the compact pane still stays under the 10/16 line budget.
- **Next-time guidance:** Any future compact-layout tweak should re-run the manual view while forcing `process.stdout.rows` low to ensure new fields don’t chase existing backlog/event slots out of the viewport.
