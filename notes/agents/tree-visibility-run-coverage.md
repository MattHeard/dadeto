# tree-visibility run coverage

- Unexpected hurdle: the entrypoint's optional `consoleError` default was the only uncovered branch after registration and handler execution were tested.
- Diagnosis: the first integration setup injected a logger, bypassing the default parameter path.
- Fix: use the production default logger while exercising both scheduled and HTTP regeneration entrypoints against an empty Firestore result.
- Evidence: strict focused Jest passed at 100% statements, branches, functions, and lines.
