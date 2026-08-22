# Admin regeneration mutation loop

- Unexpected hurdle: the bounded scan generated runtime errors in intentionally incomplete browser/dependency environments.
- Diagnosis: only two survivors remained, both in the pure status-paragraph lookup helper.
- Fix: added a direct exact-ID lookup assertion.
- Evidence: final bounded Stryker scan for lines 1800-2200 reported 0 survivors and 0 timeouts; baseline passed 83 tests.
- Next-time guidance: isolate pure DOM lookup helpers from integration setup when triaging large browser modules.
