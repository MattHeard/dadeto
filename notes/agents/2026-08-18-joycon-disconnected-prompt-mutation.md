# JoyCon disconnected-prompt mutation slice

- Unexpected hurdle: the broad prompt scan exceeded the interactive scan window before producing complete evidence.
- Diagnosis path: a smaller scan isolated survivors in `getDisconnectedPromptCopy`, and the report showed the prompt strings were not asserted directly.
- Chosen fix: exposed the pure prompt helper through the test-only surface and asserted its complete object value.
- Evidence: the bounded Stryker run over lines 1462-1464 killed both generated mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: use smaller prompt-helper ranges when Stryker runtime approaches the session window.
