# Gate script defaults coverage

- Unexpected hurdle: the default stream `write` callbacks counted as uncovered functions even though the options factory itself was exercised.
- Diagnosis: strict four-metric coverage reported 33.33% functions until both no-op callbacks were invoked.
- Fix: added a direct factory test that validates all defaults and calls both stream callbacks.
- Evidence: bead `dadeto-125` records the focused Jest command passing at 100% statements, branches, functions, and lines.
