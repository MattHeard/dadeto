# WebMCP support

- Unexpected hurdle: `copy:dendrite` rewrote stale generated browser files unrelated to this change.
- Diagnosis: the source browser tree is newer than the checked-in infra copy; the generated noise was restored while retaining the new WebMCP asset.
- Fix: added the optional `document.modelContext.registerTool` integration and loaded it on the blog and Dendrite templates/static pages.
- Next time: reconcile the source/infra copy drift separately before relying on a full Dendrite copy as a narrow validation step.
