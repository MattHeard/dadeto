# Neon Covenant Spec

## Summary

Toy: NEON1 — Neon Covenant: Frontier Lab. Owner: dadeto-srg7. Updated 2026-10-03.

Living Frontier Lab expansion owner: dadeto-88mh. The approved four-release expansion keeps this game identity, storage key, controller alphabet and 28-shift campaign. Release 1 begins with named staffing and lossless migration; clinic/cooling introduction, forecasts and causal incident chains are required before that release is complete.

## Problem Statement

Run a frontier AI lab through conversations and terminals rather than overhead construction. Keep useful research, payroll, power, safety, contracts and staff commitments in tension.

## Boundary

An independent episode injects management rules into Mosslight's shared fixed-step runtime and mobile presenter. Movement, collision, eight-button input, dialogue panels, bitmap font, sprite rasterization, save slots and agent tools remain shared.

## Scope

Five connected rooms, four colleagues, three research programs, three contracts, six resolutions, 28 shifts, six decision points per shift. Separate local saves and embedded toy. No real AI training, accounts, multiplayer or monetization.

## Actors and Interfaces

Player: lab director. Ada researches, Ion maintains compute, Sable evaluates safety, Mae represents the clinic. Inputs are exclusively directions/A/B/X/Y. The output is the shared 160×144 canvas frame.

## Assumptions and Constraints

Credits represent thousands. Only ending a shift settles the economy. Held buttons do not repeatedly select menu items. Menus own input ahead of suspended conversations. Save identity is neon-covenant, not mosslight-valley.

## Dependencies

Mosslight runtime, world, actors, dialogue, renderer, pixel sprites, input, audio, save and page presenter. No external simulation services.

## Named personnel and save contract

`personnel.js` owns authored employees and candidates, roster/team accounting, contextual thoughts, explicit assignments, fatigue settlement and legacy roster reconstruction. The inherited payroll is Ada and Jun in research, Sable in safety, and Ion in service, each at 3k per shift. Mae remains the external clinic partner. Six candidates cost 18k to hire and add 3k recurring payroll. Rejected and unchanged orders cost no attention.

The controller staff console selects a person before a destination team; it never silently selects a donor. Listening to concerns opens the shared paginated dialogue and is free. Thoughts derive from fatigue, cooling, data consent, evaluator availability and support capacity, so loading cannot reroll them. Protected shifts reduce fatigue by eight; balanced shifts add three and sprint shifts add ten. Team rest reduces each person's fatigue by twenty.

Save envelope version 2 is unchanged. Neon `lab.rulesVersion: 1` adds a persistent roster whose team totals and payroll must match the ledger. An optional shared save-profile migration runs before episode validation, without changing Mosslight profiles. Unversioned Neon ledgers receive a named roster matching historical team counts, including stable identities for anonymous legacy hires. Cash, debt, progress, contract terms, promises, incidents, outcome and shift are untouched. Introduction/delegation compatibility and two-settlement incident grace are recorded for later release systems.

The first successfully migrated serialized save is retained in the same storage root under `migrationBackups[slot]`. Later migrations never replace that backup. Invalid imports change neither the campaign nor its backup. Only an explicit reset clears that slot's backup, including resets without an idempotency receipt. Other slots and the Mosslight namespace are untouched.
