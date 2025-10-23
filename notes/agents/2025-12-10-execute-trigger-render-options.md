# Execute trigger render max-params cleanup

- Converted `executeTriggerRender` to accept a single options payload so the helper clears its `max-params` warning without changing behaviour.
- Updated the admin core tests to exercise the new signature and confirm success/failure messaging still propagates.
