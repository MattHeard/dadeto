# Lint cleanup for generate stats env detection

- Challenge: ESLint's `no-ternary` rule flagged the `envRef` assignment in `src/core/cloud/generate-stats/core.js` while the file already carries many other complexity violations. Converting the ternary without introducing more branches needed to stay compatible with the existing style.
- Resolution: Replaced the ternary with a simple `if` block that assigns the validated env object to `envRef` only when it is usable. This cleared the warning without affecting behavior or adding new lint issues.
