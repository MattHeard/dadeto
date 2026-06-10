# CLAUDE.md - Dadeto Blog Generator

## Commands
- `npm test` - Run all tests
- `npm run test-watch` - Run tests in watch mode
- `npm test -- -t "test pattern"` - Run specific test matching pattern
- `npm run generate` - Generate the blog HTML
- `./tcr.sh [commit message]` - Test && Commit || Revert

## Code Style
- **ES Modules**: Use import/export syntax
- **Naming**: Constants in UPPERCASE, functions in camelCase
- **Function Docs**: JSDoc comments for functions
- **HTML Generation**: Prefer composable helper functions
- **Error Handling**: Use defensive coding (null checks with || [])
- **Quotation**: Use double quotes for HTML attributes and strings
- **Constants**: Define reusable constants for HTML elements/attributes
- **Security**: Always use escapeHtml for user-provided content
- **Formatting**: Use consistent indentation (2 spaces)
- **File Structure**: Modular components in separate files
- **Linting**: Never use `eslint-disable` comments. Resolve warnings instead of suppressing them.

## ESLint Complexity Reduction Patterns

When reducing complexity warnings, focus on patterns that WORK:

**✅ What Works:**
- **Logic simplification**: Remove conditions that are redundant or can be combined (e.g., removing an unnecessary if-check in an arrow function)
- **Trivial extraction**: Extract complex logic into helper ONLY if the calling function becomes nearly empty (1-2 lines). Example: extract validation check into `isValidSnapshot()`, leaving caller with just one function call.
- **Split chained operators**: For `a ?? b ?? c` (complexity 3), extract `b ?? c` into helper. Result: two functions with complexity 1 each. Example: `resolveBothHeaders(u, l)` → `u ?? resolveLowercaseHeader(l)` where helper is `l ?? null`. Both now pass complexity limit.
  - **Variant 1**: Extract just ONE operator (e.g., `context?.userRecord ?? {}` → extract only `context?.userRecord`). Helper gets complexity 1, main function drops to complexity 2. Example: `resolveUserRecord` extracted `extractUserRecordFromContext()` for optional chaining, leaving main with just nullish coalescing.
  - **Variant 2**: Extract the || operator when mixed with conditions (e.g., `if (!x) return default; ... return y || 'fallback'` → extract `y || 'fallback'`). Helper has complexity 1, main function drops to complexity 2. Example: `defaultInvalidTokenMessage` extracted `resolveErrorMessageWithDefault()` for the || operator.
- **Genuine refactoring**: Only when you understand the function deeply and can predict the complexity impact

**❌ What Doesn't Work:**
- **Moving complexity**: Extracting a helper that has the same complexity as original (net-zero violation reduction)
- **Blind extraction**: Creating helpers without ensuring the calling function becomes simpler
- **Ignoring rule conflicts**: Remember no-ternary rule conflicts with complexity reduction via ternary conversion
- **JSDoc loss**: Extraction that drops documentation creates new violations

**Key Insight**: Complexity violations are legitimate. Not all can/should be "fixed"—some are hard-wired into the domain logic. Accept constraints and focus extraction on functions where the pattern genuinely simplifies structure.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
