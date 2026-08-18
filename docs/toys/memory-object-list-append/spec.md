# Toy Spec: Memory Object List Append

## Summary
- Toy name: Memory Object List Append (`MEMO4`)
- Owner: Dadeto generic memory management
- Last updated: 2026-08-18

## Problem Statement
Append one structured object to a persisted list without replacing the list.

## Scope
- In scope: temporary, permanent, and envelope memory; dot paths; JSON object append.
- Out of scope: deduplication, removal, querying, transactions, and schema validation.

## Interface
Input: `{ "memoryLocation": "temporary", "path": "items", "object": { ... } }`.
Output: append status and resulting list length.
