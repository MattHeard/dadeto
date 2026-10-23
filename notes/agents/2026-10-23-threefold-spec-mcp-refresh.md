# THREEFOLD spec freshness repair

- **Unexpected hurdle:** The repository's spec refresh/check CLI and required GitHub Actions gate need `NOTION_THREEFOLD_SPEC_READ_TOKEN`, which is unavailable in this workspace; both fail closed before fetching or writing.
- **Diagnosis:** The connected Notion page was readable through the approved Notion connector. Its bounded `Creative north star`–`Reference context` section matched `docs/toys/threefold/spec.md` byte-for-byte; only the generated `Source last edited` metadata lagged the page timestamp.
- **Chosen fix:** Updated only the generated timestamp to the current Notion page edit time, then verified the shared pure formatter reproduces the complete file exactly. Focused sync/workflow tests, full local check, build, manuals, and `git diff --check` passed.
- **Next-time guidance:** When the direct Notion token is missing, compare the exact bounded source through the connected Notion reader and regenerate only if the full section matches. Keep the CI check fail-closed; configure the dedicated read-only token to prove the live CLI and exact-head workflow.
