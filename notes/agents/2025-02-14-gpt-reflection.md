# Reflection

- Running `npm run lint` takes several minutes because ESLint scans the entire repo and streams the report to `reports/lint/lint.txt`. I initially suspected the command had frozen; checking `ps` showed eslint saturating a CPU core, so patience is required.
- Refactoring the authorization helper revealed how aggressive the complexity rule is—optional chaining and ternaries both count toward the limit. Splitting the logic into purpose-built helpers was the only reliable way to lower the score.
- `reports/lint/lint.txt` is overwritten on every lint run. Capture terminal chunk IDs or copy the file beforehand if you need to compare reports between runs.
