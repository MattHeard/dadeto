# JSON utility facade coverage

- Unexpected hurdle: a bare re-export produced no instrumentable statements, so focused coverage reported 0% despite the shared parser being exercised.
- Diagnosis: the facade itself had no callable code for the coverage runner to observe.
- Fix: replaced the bare re-export with a documented one-line forwarding function and tested valid and invalid JSON behavior.
- Evidence: bead `dadeto-tde` records the focused Jest command passing at 100% statements, branches, functions, and lines.
