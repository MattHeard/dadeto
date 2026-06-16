# Manual toggle scroll fix — 2026-06-16

- **Unexpected hurdle:** The manual block used hash links and `:target`, so clicking show/hide changed the page scroll position instead of just opening or closing the block.
- **Diagnosis path:** Traced the generated HTML from `src/core/build/generator.js` into `src/core/build/styles.js` and confirmed the toggle depended on anchor navigation rather than local state.
- **Chosen fix:** Replaced the hash links with local button controls, added a tiny inline module script to toggle the manual body in place, and removed the `:target` styling path.
- **Next-time guidance:** When a generated control is meant to feel modal-free, avoid hash-based state unless you explicitly want scroll anchoring as part of the interaction.
