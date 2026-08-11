# Billing hardening runbook

This runbook applies to the Firestore billing runtime and its Stripe webhook boundary.

## Emergency controls

1. Disable new checkouts by setting the checkout feature flag/configuration to false. Keep balance reads and reconciliation enabled.
2. Disable spending for one billing identity by marking its API key suspended. The operation boundary must fail closed before reservation.
3. Disable a package by setting its catalog `active` field to false. Existing purchases retain their immutable pricing snapshot.
4. During provider or ledger uncertainty, use read-only mode: reject checkout and new reservations while allowing status reads and reconciliation.

## Webhook incident response

- Preserve the Stripe event ID, purchase ID, payment/refund identifier, and deployment revision.
- Do not manually add credits. Re-run the verified event through the webhook recovery path.
- Duplicate delivery is safe: the event receipt and ledger source event ID are idempotency keys.
- If a webhook is verified but processing fails, retry after the dependency outage is resolved.
- If a purchase is paid, never apply a later expiry event.

## Ambiguous operations

- `reserved` means credits are held and unavailable to other operations.
- `settled` means the downstream operation completed and the reservation is final.
- `released` means confirmed failure restored the reservation allocations.
- `needs_recovery` means the downstream result is unknown. Do not release until the operation outcome is established.
- Resolve through `billing.resolveOperation`; repeated resolution of a terminal state is harmless.

## Reconciliation

Run `billing.reconcileIdentity(uuid)` in read-only mode and retain the report. Investigate:

- `ledger_balance_mismatch`: ledger event sum differs from aggregate balance;
- `lot_balance_mismatch`: credit lots differ from aggregate balance;
- `provider_payment_without_purchase`: provider payment has no matching purchase.

Detection comes before repair. Any corrective action must reference the original provider event or an approved manual adjustment record.

## Secret rotation

Deploy the replacement Stripe webhook secret, verify test-mode delivery, then remove the old version after the provider rotation window. Never log or paste secret values. A signature failure is an availability/security event, not a reason to bypass verification.

## Production gate

Enable passive billing only after focused tests, cloud packaging, webhook test-mode verification, reconciliation review, IAM/secret review, and an independent adversarial review have all produced retained evidence.
