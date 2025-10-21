# ESLint cleanup for removeElements helpers

Refactored the key-value removal helpers to share a selector-based factory so the individual exports no longer trigger our low complexity threshold. Verified the change with `npx eslint src/inputHandlers/removeElements.js --no-color` to ensure the warnings disappeared.
