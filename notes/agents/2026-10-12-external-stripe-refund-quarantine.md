# External Stripe refund quarantine

- Unexpected hurdle: Matching a `charge.refunded` event's original payment intent to the purchase is insufficient; a manual Stripe refund can share that same payment intent, and the repo has no DADETO refund-intent record.
- Diagnosis: Read the billing protocol spec, inspected the payment webhook state writer and `createBillingRuntime`, and confirmed no Stripe refund creation or durable intent path exists.
- Chosen fix: Route every `charge.refunded` event to durable reconciliation and return a quarantined response before credit reversal. Preserve the event, purchase, payment-intent, charge, and refunded amount identifiers. The event inbox then records `quarantined` and treats replay as a duplicate.
- Evidence: Focused billing runtime suite passed (27 tests); payment webhook core and wrapper suites passed (29 tests); configured `npm run check` passed all 10 quality gates, including complete unit coverage and 11 local E2E tests.
- Next-time guidance: Add DADETO-originated refund requests and exact durable refund-intent matching before allowing a webhook to reverse credits. Tracked in Bead `dadeto-axc9`.
