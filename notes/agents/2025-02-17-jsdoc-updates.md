# Reflective Notes - 2025-02-17

- **Surprise:** Running `npm run lint` auto-applied fixes (due to `--fix`) across many files, introducing unrelated diffs. I initially expected eslint to only report issues because I just wanted to verify JSDoc warnings.
- **Diagnosis:** `git status` showed dozens of modified files right after the lint run. Inspecting the npm script revealed the `--fix` flag.
- **Resolution:** I reverted the unintended changes with `git checkout --` for the affected directories before committing. Going forward I'll plan for a clean tree or run eslint against specific files when verifying documentation tweaks.
- **Follow-up Idea:** Consider adding a script variant (e.g., `npm run lint:check`) without `--fix` for validation-only workflows.
