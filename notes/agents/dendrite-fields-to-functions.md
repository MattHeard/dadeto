# Dendrite field functions

- **Unexpected hurdle:** The request to switch the dendrite field declarations from constants to functions was straightforward, but I double-checked existing references to avoid breaking generated code that still uses the constants directly; keeping the shared option list isolated let me wrap both handlers in small factories without touching other modules.
- **Lessons:** When two exported handlers share the same base data, helper functions can construct fresh arrays on demand, which keeps potential mutation safer for callers expecting unique instances.
- **Follow-up:** If the handlers ever need parameterization (e.g., to change the option list), consider promoting the helper functions to shared utilities so toys can customize them while staying DRY.
