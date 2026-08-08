# Payment webhook core coverage

- Unexpected hurdle: the existing credit-event tests covered the default purchase adapter but not the configured purchase-event response path.
- Diagnosis: coverage identified the response recording lines and the wrapper function for a supplied purchase handler as uncovered.
- Fix: added a test for a successful purchase event with no API-key mapping, verifying the `purchase` fallback key and returned response.
- Next-time guidance: for optional webhook handlers, test both the default no-op and configured handler paths, including fallback identifiers.
