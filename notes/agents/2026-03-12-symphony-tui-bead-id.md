# 2026-03-12: Symphony TUI bead id highlight
- **Unexpected hurdle:** the 40x10 TUI already uses every line/column, so emphasizing the bead id risked either dropping other fields or overflowing the layout.
- **Diagnosis path:** reviewed `scripts/symphony-tui.js` to confirm the TUI clamps to 40 columns and limits itself to ten lines, then reasoned that a single line could be repurposed to spotlight the bead id without touching the footer logic.
- **Chosen fix:** push the bead id to the front of the bead line (`ID <id>` with the title as a suffix), wrap that line in a bold ANSI sequence, and keep the rest of the electronics untouched so the 40x10 view stays compact and legible.
- **Next-time guidance:** if attention needs to climb further, adjust the reserved footer/evidence budget before adding more lines so the pill view still fits in ten rows.
- **Testing:** `npm test`
