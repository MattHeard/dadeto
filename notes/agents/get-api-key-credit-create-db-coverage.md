# API key credit database factory coverage

- Hurdle: the factory was fully covered except for its default-argument path and the explicit Firestore `(default)` sentinel.
- Diagnosis: existing tests covered a configured custom id and blank id, but not environment omission or the sentinel guard.
- Fix: add focused cases for both paths and assert the constructor receives no database options.
- Guidance: test both explicit platform sentinel values and omitted dependency/environment arguments in small factories.
