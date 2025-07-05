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
