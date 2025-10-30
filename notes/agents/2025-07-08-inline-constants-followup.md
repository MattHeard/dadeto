# Inline dendrite constants follow-up

- Removed the shared `dendrite` constants module so each handler carries only the fields it needs.
- Double-checked the toy loader to ensure no remaining imports referenced the deleted module.
