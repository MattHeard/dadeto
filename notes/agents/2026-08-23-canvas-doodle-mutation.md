# Canvas doodle toy mutation follow-up

## Unexpected hurdle

The first rerun hit Stryker's process logging-server `listen EPERM` sandbox restriction before mutation testing began.

## Diagnosis and fix

The initial scan identified unused fallback color fields and unobservable default random-helper branches. Removed the dead fallback colors and added exact equivalence coverage for the default random helper plus an environment without `get`.

## Evidence

The authoritative rerun instrumented 12 mutants: all 12 killed, 0 static-ignored, 0 non-static survivors, and 0 timeouts. Focused Jest passed 4 tests.
