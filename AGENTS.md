# Repository Guidelines

## Issue Tracking

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection.

**Pro tip:** try each `bd` command without `--no-daemon` first; if it fails or times out due to daemon / lock issues, rerun it with `--no-daemon` to skip the background service.

**Quick reference:**
- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd close <id>` - Complete work
- `bd sync` - Sync with git (run at session end)

- Before editing any files for a bead, mark it in progress via `bd update <id> --status=in_progress` so the status reflects your work.

For full workflow details: `bd prime`

## General Recommendations for Future Agents
- **Consult guidelines and past notes first.** Review relevant documentation, retrospectives, and prior changes before starting work so your approach aligns with established patterns and known pitfalls.
- **Plan broad changes carefully.** Script repetitive edits, break large refactors into incremental steps, update related docs, and validate each phase—especially configs and tests—before moving on.
- **Map renames before moving code.** Scope the blast radius of any file move or rename with a global search (source, tests, scripts, infra) and update all references in the same change; jot a short retrospective so the rationale stays discoverable.
- **Test and lint early and often.** Run the suite and lint checks throughout your work, address failures immediately, and record the commands and outcomes in your PR notes.
- **Practice defensive programming.** Anticipate edge cases, validate inputs, prefer safe defaults, and resolve lint findings instead of disabling rules so the system fails gracefully when surprises occur.
- **Keep project guidelines cohesive.** When you add or revise rules, integrate them with existing sections, update references after structural changes, and maintain the established tone and formatting.
- **Emphasize learning in retrospectives.** Capture unexpected hurdles, how you diagnosed them, and actionable follow-ups so future agents can apply the lessons without repeating the discovery process.
- **Communicate clearly and proactively.** Use descriptive commit messages, summarize intent and testing in PRs, link supporting artifacts, and flag any behavioral changes that reviewers should note.

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

## Refactoring & Complexity
- Treat ESLint complexity warnings as actionable; optional chaining, ternaries, and nested callbacks all count, so extract helpers until functions sit comfortably below the threshold.
- Refactor in small steps, running `npm run lint` (and targeted tests) after each extraction to catch new hotspots introduced by helpers.
- Keep helpers single-purpose with clear branching, and prefer early returns to avoid hidden decision points that push complexity back up.

## Testing Guidelines
- Tests run under Jest + jsdom. Name files `*.test.js` and colocate them with the modules they exercise.
- Avoid `jest.resetModules`, `jest.unstable_mockModule`, and `import.meta.url`; they break mutation testing.
- Always run `npm test` and `npm run lint` before pushing. If they fail, document the failure and corrective steps in your PR.
- If any files under `src/core/` are modified, run `npm test` after your changes to ensure the core logic remains stable.
- Use exported entry points instead of loading internals via `eval` or dynamic imports; export pure helpers (clearly marked as internal/test-only) when deeper testing is required.
- Prefer focused unit tests for helper logic over piling edge cases into a single integration test; keep integration coverage for the main flow and let unit tests exercise the branches.
- Build reusable fixture builders for complex object graphs (e.g., nested Firestore-style document chains) so tests share consistent setups and avoid missing links.
- When Watchman causes Jest issues, rerun with `--watchman=false` to keep targeted suites running; capture any such flags in your PR notes.

## Commit & Pull Request Guidelines
- Write concise commit messages that summarize the change and its intent.
- Pull requests must include a "Summary" of code changes and a "Testing" section listing executed commands (e.g., `npm test`, `npm run lint`).
- Link relevant issues and include screenshots or artifacts when UI behavior changes.
- Ensure generated outputs or reports are up to date, but avoid committing transient build products outside approved directories.

## Agent Retrospectives
- After completing your work, add a reflective note in a new file under `notes/agents/`. Create the directory if it does not yet exist.
- Focus on **unexpected** hurdles or surprises. Describe what threw you off, how you diagnosed the issue, and the options you considered before landing on a fix.
- Capture what you learned or would do differently next time. Convert that learning into actionable guidance (links to source, scripts, or checklists) so future agents can benefit immediately.
- Close with any open questions or follow-up ideas that surfaced while solving the problem.
- Keep the note concise (a few focused paragraphs or bullets) but specific enough that another agent could reuse the insight without rereading the entire codebase.

## Automation & Deployment Notes
- Terraform changes are applied by `.github/workflows/gcp-prod.yml`; modify the workflow to adjust behavior instead of running Terraform manually.
- Mutation analysis and quality gates rely on Stryker and Sonar scripts—run `npm run stryker` or `npm run sonar-issues` only when coordinated with maintainers, and capture their reports under `reports/` if shared.
- If tool output is hard to interpret, use more targeted options (e.g., ESLint JSON output with a lower local complexity threshold) to surface hot spots before broader refactors.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Record evidence** - Before closing a bead, add a comment that covers what changed, commands run, outcomes, and follow-ups.
8. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
