# AGENTS Instructions for dadeto

## Scope

These instructions apply to the entire repository. They describe how ChatGPT
agents should interact with this code base.

## Testing

Always attempt to run `npm test` and `npm run lint` after making changes.
If these commands fail because dependencies are missing or the scripts cannot
be found, first run `npm install` and try again. If they still fail or other
issues occur, note the failure in the PR message's Testing section.
Before opening a pull request, ensure that branch coverage remains at 100%.

## Terraform

- Do not run Terraform commands directly.
- When Terraform actions are required, update the Terraform GitHub Actions
  workflow (e.g., `.github/workflows/deploy-terraform.yml`) to perform them
  instead.

## Jest Restrictions

The following Jest features cause issues with Stryker mutation testing and must never be used:

- `jest.resetModules`
- `jest.unstable_mockModule`
- `import.meta.url`

## Testing Internal Functions

- Do not load unexported functions by reading their source and using `eval`.
- Prefer testing internal logic through an exported function that calls the function under test.
- If direct testing is necessary, export the function instead of using the parse-eval method.
- Do not use dynamic `import()` to load source modules. Use static imports instead.
- Avoid using `vm.SourceTextModule` or other dynamic module evaluation to load modules as Stryker cannot instrument them.
- Do not read source files with `fs.readFileSync` and regex to assert code contents; Stryker cannot handle this approach.

## Code Style

- Follow the guidelines in `CLAUDE.md` for naming and formatting.
- Use Prettier with the configuration in `.prettierrc`.
- Never use `eslint-disable` comments. Fix the offending code or allow the warning.

## Commit Messages

Write clear commit messages that summarize the change.

## Pull Request Summary

Include a Summary and Testing section in the PR body describing the changes and
any test results or failures.

## File Restrictions

- Do not commit zip archives (`*.zip`). These files are ignored via `.gitignore`
  and should not be added to pull requests.
