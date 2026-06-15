# Fractal beta speed-run — 2026-06-15

- **Unexpected hurdle:** The five-minute loop left no room for a richer fractal engine or full quality pass, so the first release had to use the existing canvas shape protocol directly.
- **Diagnosis path:** Reused the canvas doodle presenter contract, generated key `FRAC1` with the blog-key toy, shipped a beta post, then verified `mattheard.net/?beta#FRAC1` with Playwright.
- **Chosen fix:** Added a recursive fractal tree toy that emits `rect` and `line` shapes for the `canvas-2d` presenter and kept the post behind `release: "beta"`.
- **Next-time guidance:** Follow up with unit tests, example inputs, and richer fractal types after live proof exists; the speed-run loop should optimize for deployed behaviour first.
