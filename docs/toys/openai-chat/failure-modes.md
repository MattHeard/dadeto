# OpenAI Chat Failure Modes

## Initial Predicted Failure Classes

- Setup/configuration mismatch: either feature flag is off, provider secret is absent, or the pricing snapshot lacks the exact operation price.
- Invalid or missing inputs: the Firebase token, message list, byte limit, or idempotency key is invalid.
- Dependency/service unavailable: Firebase Auth, Firestore, billing, or OpenAI does not respond.
- Non-deterministic timing or ordering: provider timeout leaves a reserved operation with uncertain outcome; a new key could duplicate a charge or provider call.
- Environment-specific behavior: CORS origin differs from the configured DADETO production origin.

## Detection Signals

- `chat_unavailable` or `pricing_unavailable` indicates disabled or incomplete service configuration.
- `unauthorized` indicates missing or invalid Firebase authentication.
- `invalid_request`, `request_too_large`, and `idempotency_key_required` indicate rejected client input.
- `operation_pending`, `operation_outcome_unknown`, or `provider_unavailable` indicate an ambiguous request that must be retried with the same idempotency key.

## First-Response Playbook

1. Check the function feature flag, billing flag, secret reference, operation price, and deployed function revision without printing secret values.
2. Check HTTP status and stable error code; never log the bearer token or reply body.
3. For ambiguous provider outcomes, retry only with the same idempotency key; do not create a new attempt until the previous outcome is resolved.
4. Reproduce validation and billing behavior with injected fakes before considering a live provider request.

## Promoted from Real Failures

- Date: 2026-10-23
- Failure observed: `npm run manuals:check` rejected the new toy folder because it did not contain `manual.md`.
- Root cause: the checker requires one manual page for every directory under `docs/toys/`.
- Fix implemented: add a schema-backed manual and keep its availability limitations explicit.
- Guardrail added: the mandatory manuals check is part of the documented acceptance commands.
