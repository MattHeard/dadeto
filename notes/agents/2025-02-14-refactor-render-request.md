# Refactoring render request authorization

- **What surprised me:** Running the lint target produced hundreds of complexity warnings and auto-formatted a few files I had not touched. The biggest complexity hit came from the render-contents handler, which was tied with other hotspots at 14.
- **How I diagnosed it:** I parsed `reports/lint/lint.txt` with a quick Python snippet to surface the maximum complexity and confirm that `handleRenderRequest` was one of the worst offenders. Re-running lint after the refactor ensured the helper extraction actually lowered the numbers.
- **Actionable follow-up:** When breaking down large handlers, prefer dedicated authorization/resolution helpers so the main flow stays linear. The same approach should be applied next time we tackle `buildOptionMetadata` or `resolveStoryMetadata`, which still sit at 14 in the report.
