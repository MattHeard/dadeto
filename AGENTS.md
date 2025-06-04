# AGENTS Instructions for dadeto

## Scope

These instructions apply to the entire repository. They describe how ChatGPT
agents should interact with this code base.

## Testing

Always attempt to run `npm test` and `npm run lint` after making changes.
If either command fails due to missing dependencies or other issues, note the
failure in the PR message's Testing section.
Before opening a pull request, ensure that branch coverage remains at 100%.

## Code Style

- Follow the guidelines in `CLAUDE.md` for naming and formatting.
- Use Prettier with the configuration in `.prettierrc`.

## Commit Messages

Write clear commit messages that summarize the change.

## Pull Request Summary

Include a Summary and Testing section in the PR body describing the changes and
any test results or failures.
