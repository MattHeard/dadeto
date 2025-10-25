# Token guard refactor follow-up

## Context
A reviewer called out the `__TEST_ONLY__` export that had been introduced to exercise the admin token guard error branch.

## Approach
I extracted `createAdminTokenAction` into its own module so the core implementation reuses it while tests import it directly, avoiding test-specific exports. After moving the helper I reran the full Jest suite with coverage and the lint task to confirm the refactor preserved behavior.
