# Tree visibility weights

- Unexpected hurdle: the focused renderer tests require Jest's VM module mode because the renderer loads HTML templates through `import.meta.url`.
- Diagnosis: the existing target metadata builder was the single place where immediate visibility became browser weights; new variant creation also had one centralized payload builder.
- Chosen fix: add a small tree-visibility core with defaults, threshold comparison, delta helpers, and propagation seams; integrate backward-compatible rendering fallbacks and successful-render dirty clearing.
- Next-time guidance: finish wiring propagation into page attachment and visibility updates, then add the scheduled regeneration and rerunnable migration entrypoints before closing the feature bead.
