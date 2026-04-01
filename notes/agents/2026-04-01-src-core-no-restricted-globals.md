# 2026-04-01 – src/core no-restricted-globals warning

- **Unexpected hurdle:** The repo workflow expects `bd`, but the command is unavailable in this environment.
- **Diagnosis path:** Ran `bd prime` first and confirmed `/bin/bash: bd: command not found`, so bead logging could not be executed.
- **Chosen fix:** Scoped the change to ESLint flat config only and added a src/core-specific `no-restricted-globals` warning configuration.
- **Next-time guidance:** Ensure `bd` is installed in runner images so loop-contract/evidence can be recorded per router requirements.
