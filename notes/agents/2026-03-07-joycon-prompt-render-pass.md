## Joy-Con prompt/render warning pass

- Unexpected hurdle: the first tail-of-file cleanup just moved some complexity from the row-render callback into new helper functions, which meant the owned warning count barely improved until the helper boundaries were tightened again.
- Diagnosis path: used the file-scoped ESLint output on `src/core/browser/inputHandlers/joyConMapper.js` after each small refactor to isolate only the prompt/render warnings and avoid drifting back into capture or storage logic.
- Chosen fix: introduced prompt/render-local helpers for row state, prompt copy selection, and handler start-state setup so the row-render callback, `renderPrompt`, the start-button ternary path, and the skip-button callback all shrank without touching the earlier warning families.
- Next-time guidance: for this file, treat the row/prompt tail as a separate lint slice; move one branch family at a time and re-run the file-specific lint check after each helper extraction so you can see whether complexity actually dropped or just relocated.
