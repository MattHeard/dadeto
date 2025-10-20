# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the blog generator, including `generator.js`, HTML helpers, and the `blog.json` content source; keep new modules focused on a single responsibility.
- `public/` contains generated assets. Do not edit files here directly—run the generator instead.
- `test/` stores Jest suites mirroring the `src/` layout. Place fixtures alongside the tests that consume them.
- `infra/` houses Terraform definitions that are applied via GitHub Actions; update workflows rather than running Terraform locally.
- Support directories such as `reports/` and `docker/` store tooling output and scripts; avoid checking in derived artifacts outside these folders.

## Build, Test, and Development Commands
- `npm install` installs dependencies; rerun when scripts complain about missing packages.
- `npm run generate` builds the blog into `public/index.html`; pair with `npm run copy` when static assets change.
- `npm run build` (alias for `build:browser`) performs the full copy-and-generate pipeline.
- `npm test` executes Jest with coverage; expect 100% branch coverage before submitting.
- `npm run lint` formats and lints using ESLint and Prettier, writing the report to `reports/lint/lint.txt`.
- `npm run start` serves the generated site for manual review.
- `./tcr.sh "message"` runs the TCR workflow; use it when practicing test-driven iterations.

## Coding Style & Naming Conventions
- Follow `CLAUDE.md`: two-space indentation, ES modules, camelCase functions, and UPPER_SNAKE_CASE constants.
- Keep generator utilities composable, documented with JSDoc, and defensive (null checks, `escapeHtml` for user content).
- Run Prettier through the configured ESLint integration; never add `eslint-disable` comments.

## Testing Guidelines
- Tests run under Jest + jsdom. Name files `*.test.js` and colocate them with the modules they exercise.
- Avoid `jest.resetModules`, `jest.unstable_mockModule`, and `import.meta.url`; they break mutation testing.
- Always run `npm test` and `npm run lint` before pushing. If they fail, document the failure and corrective steps in your PR.
- Use exported entry points instead of loading internals via `eval` or dynamic imports; export helpers when deeper testing is required.

## Commit & Pull Request Guidelines
- Write concise commit messages that summarize the change and its intent.
- Pull requests must include a "Summary" of code changes and a "Testing" section listing executed commands (e.g., `npm test`, `npm run lint`).
- Link relevant issues and include screenshots or artifacts when UI behavior changes.
- Ensure generated outputs or reports are up to date, but avoid committing transient build products outside approved directories.

## Agent Retrospectives
- After completing your work, add a brief note in a new file under `notes/agents/` describing the specific challenges you encountered and how you resolved them. Create the directory if it does not yet exist.

## Automation & Deployment Notes
- Terraform changes are applied by `.github/workflows/gcp-prod.yml`; modify the workflow to adjust behavior instead of running Terraform manually.
- Mutation analysis and quality gates rely on Stryker and Sonar scripts—run `npm run stryker` or `npm run sonar-issues` only when coordinated with maintainers, and capture their reports under `reports/` if shared.
