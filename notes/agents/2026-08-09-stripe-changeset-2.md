# Stripe billing changeset 2

- Unexpected hurdle: existing wrapper tests encoded the old unsigned/custom `payment-signature` contract.
- Diagnosis: production already uses the generic payment handler below the wrapper, so only the wrapper parser needed replacement.
- Chosen fix: inject Stripe's `constructEvent` adapter, require `STRIPE_WEBHOOK_SECRET`, exact raw body, and `stripe-signature`, then pass only the verified event into the existing handler. Removed the unused custom HMAC verifier.
- Next-time guidance: keep provider-specific verification in the cloud edge and preserve the generic payment event domain model for catalog and settlement work.
