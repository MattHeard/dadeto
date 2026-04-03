# BlogKey / REAL1 clone cleanup

- Hurdle: the 52-token `jscpd` hit was not a logic clone, it was the shared `hideAndDisable -> cleanContainer -> buildForm` handler wrapper in `blogKeyHandler` and `realHourlyWage`.
- Diagnosis: the duplication report showed the exact pair, and the wrapper was confirmed to be the same call scaffold with different `buildForm` bodies.
- Fix: extracted `runFormHandler` in `createDendriteHandler.js`, rewired both handlers to use the shared wrapper, and raised `jscpd` to `minTokens = 41`.
- Next time: when a clone is just a repeated handler shell, prefer a single shared helper in the nearest input-handler core module, and keep the helper’s signature object-shaped to stay within lint limits.
