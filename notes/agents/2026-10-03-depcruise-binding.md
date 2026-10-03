# Dependency gate binding

The checker factory's closure tail matched option-normalization structure. The
public factory now binds normalized dependencies directly to executeDepcruiseGate;
the redundant intermediate closure factory is removed. Normalization still runs
once at creation, while every handler call executes the captured command anew.

Regression evidence `.tmp/depcruise-binding-tests.log`: 43 tests and exact 100%
checker coverage. Replacing input options after creation does not replace captured
dependencies, and repeated calls have identical command arguments. Static:
`.tmp/depcruise-binding-static.log`, duplication only, 55 to 54 strict clones.
Build `.tmp/depcruise-binding-build.log` passes. No threshold/ignore changes;
dadeto-aaou remains open pending zero clones and terminal full green.
