# Simulator exit status

Explicit process exit codes take precedence, even zero paired with a signal.
Only a null code uses signal truthiness as a numeric failure indicator.
Replacing the duplicate terminal return-zero branch with this policy reduced
strict minTokens14 clones from 48 to 47 without changing detector configuration.

The combined lifecycle test covers null/empty/signal exits and explicit zero
and nonzero code precedence. Three focused runner suites pass 17 tests with
exact 100% module coverage: `.tmp/simulator-exit-tests.log`.
Static aggregate fails only duplication47: `.tmp/simulator-exit-static.log`.
Build passes: `.tmp/simulator-exit-build.log`. Full aggregate follows this batch;
dadeto-aaou and the zero-clone goal remain active.
