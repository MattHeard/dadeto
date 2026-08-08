# Render-author run coverage

- Hurdle: the adapter imported `render-author-core.js`, whose HTML template uses `import.meta.url`, so Babel/Jest CommonJS could not load the module.
- Diagnosis: the target adapter only needs the trigger and handler contracts; the import failure was unrelated to its wiring logic.
- Fix: mock those two contracts at the adapter boundary, then exercise dependency construction and the returned trigger handler.
- Guidance: use the same boundary-mock pattern for other Cloud adapters that import native ESM/template-rendering cores.
