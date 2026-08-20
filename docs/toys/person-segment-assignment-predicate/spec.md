# Toy Spec: Person Segment Assignment Predicate

## Summary
- Toy name: Person Segment Assignment Predicate (`PERS2`)
- Last updated: 2026-08-20

Return whether a proposed person-to-segment assignment can be appended without temporal overlap for that person.

## Rules
- Only assignments for the proposed `personId` are considered.
- Positive-duration temporal overlap returns `false`.
- Touching intervals are allowed.
- The predicate is pure and returns a JSON boolean.
