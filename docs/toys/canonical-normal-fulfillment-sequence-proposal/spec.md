# Canonical Normal Fulfillment Sequence Proposal

## Summary

- Toy name: CANO1
- Last updated: 2026-08-23

Consumes SPAC8-compatible space points and returns a self-contained seven-operation normal fulfillment proposal.

## Boundary

This toy validates spatial composition only. It does not select resources, check feasibility, persist state, or calculate price.

## Interface

Inputs contain a possession context, `spacePoints`, canonical warehouse, travel durations, configuration, and generated IDs. Outputs include deduplicated sorted `spacePoints`, points, segments, and operation metadata.
