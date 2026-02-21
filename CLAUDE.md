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
