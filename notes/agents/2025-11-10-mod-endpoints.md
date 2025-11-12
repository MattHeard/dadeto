Unexpected complexity warning from `mapConfigToModerationEndpoints` turned out to be from the default parameters rather than any branching in the body. The ESLint `complexity` rule counts every default argument as a decision, so having both `config` and `defaults` default to values bumped the score to 3 even though the function merely spreads and returns three keys.

Fixing it meant removing the default for `defaults` and ensuring every caller, including the tests, supplies the shared defaults explicitly. That kept the function’s cyclomatic score at 2 while still letting callers omit `config`.

Next time, consider watching for default arguments when complexity warnings surface on short functions, and prefer wiring defaults through callers if the rule is strict. Open question: should other small helpers in this module also avoid multi-parameter defaults to dodge similar lint noise?
