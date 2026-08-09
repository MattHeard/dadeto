# Stripe billing changeset 5

- Unexpected hurdle: purchase status ownership is based on the Firebase UID persisted by checkout, while credits are stored under the owned API-key UUID.
- Diagnosis: a narrow read-only status core can verify the Firebase token, match the persisted purchase UID, and read the aggregate balance without introducing a second payment authority.
- Chosen fix: added authenticated status lookup, bounded settlement polling with delayed state, success-page wiring, and explicit missing/unknown/ownership-safe responses.
- Open question: checkout-session expiry mutation remains a follow-up because the current billing runtime has no expiry transition method; the observer already handles an authoritative `expired` status.
