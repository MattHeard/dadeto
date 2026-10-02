# Notion detached launcher defaults

Notion's custom argument resolver duplicated the shared detached launcher fallback: copy configured arguments and append `String(payload.prompt ?? '')`. Use that default path rather than maintaining another resolver. Explicitly clear `resolveArgs` after spreading options: the previous wrapper always replaced caller resolvers, so simply omitting the property would change behavior.

Reuse the shared launcher's option/return contracts rather than repeating nested lifecycle types in the adapter. The detached process module's blanket mutation suppression was removed; its injected lifecycle has direct behavioral coverage.

The new regression injects all filesystem/process dependencies, asserts undefined/null/numeric/string prompt conversion and proves caller resolveArgs is not invoked. Run Notion, Symphony and both process-launcher suites together. Artifacts: `.tmp/notion-launcher-tests.log`, `.tmp/notion-launcher-coverage`, `.tmp/notion-launcher-static.log`. The strict duplication goal remains owned by dadeto-aaou until the complete aggregate passes.
