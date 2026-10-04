# Neon Covenant Spec

## Summary

Toy: NEON1 — Neon Covenant: Frontier Lab. Owner: dadeto-srg7. Updated 2026-10-03.

Living Frontier Lab expansion owner: dadeto-88mh. The approved four-release expansion keeps this game identity, storage key, controller alphabet and 28-shift campaign. Release 1 begins with named staffing and lossless migration; clinic/cooling introduction, forecasts and causal incident chains are required before that release is complete.

### Playable first-shift contract

Fresh ledgers start at eight compute and four cooling, with the optional controller curriculum saved as `firstShiftGuide` (integer 0–4). The curriculum offers real clinic acceptance or decline, real 20k cooling repair or decline, named staff inspection, the shared settlement forecast, and explicit settlement. It owns ordinary menus and dialogues rather than running a separate tutorial economy. The main menu and final introduction choice both open it. Settlement completes the curriculum by advancing the actual day; older ledgers without the field are treated as already introduced. Import rejects malformed lesson indices without changing live state. Existing saved capacity, balances, deadlines and release requirements remain authoritative.

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

## Explanatory forecast contract

`forecast.js` projects the same `endShift` settlement used by the game, on cloned mutable ledger state. `forecastShift(state)` returns exact closing cash, bounded research gain, morale/risk/trust, employee fatigue, deadline exposure and the dominant constraint. It consumes no money, attention or time. `compareOrder(state, command)` applies the real order to a clone before projecting its settlement, so rejected orders and all costs remain consistent with gameplay.

Forecast and comparison prose is split using the renderer's `wrapDialogueText` into at most six text rows per dialogue node. Menus show two context rows and three selectable rows. Both presenters receive the same `presentation.forecast`; WebMCP controller actions inspect these screens without bypassing actual costs. Legacy progress above the authored target is never reduced by another settlement; near-target reports use the actual gain.

## Named personnel and save contract

`personnel.js` owns authored employees and candidates, roster/team accounting, contextual thoughts, explicit assignments, fatigue settlement and legacy roster reconstruction. The inherited payroll is Ada and Jun in research, Sable in safety, and Ion in service, each at 3k per shift. Mae remains the external clinic partner. Six candidates cost 18k to hire and add 3k recurring payroll. Rejected and unchanged orders cost no attention.

The controller staff console selects a person before a destination team; it never silently selects a donor. Listening to concerns opens the shared paginated dialogue and is free. Thoughts derive from fatigue, cooling, data consent, evaluator availability and support capacity, so loading cannot reroll them. Protected shifts reduce fatigue by eight; balanced shifts add three and sprint shifts add ten. Team rest reduces each person's fatigue by twenty.

Save envelope version 2 is unchanged. Neon `lab.rulesVersion: 2` adds causal episode records to the named roster introduced in rules version 1. An optional shared save-profile migration runs before validation, without changing Mosslight profiles. Unversioned Neon ledgers receive a roster matching historical team counts, including stable identities for anonymous legacy hires; version-1 ledgers retain their exact employees. Cash, debt, progress, contract terms, promises, historical incidents, outcome and shift are untouched. Both receive two protected incident settlements. Current corrupt records are rejected, including contradictory charge/stage state and future warning dates. The first exact serialized slot backup persists until explicit reset.

Authored incident definitions live in `content.js`; `incidents.js` owns cause detection, warning/intervention/incident/recovery transitions, one-charge-per-unresolved-episode accounting, paid responses and employee follow-ups. Settlement and forecast use the same pure functions. Responses consume one attention only when accepted; free comparisons expose exact costs and projected outcomes. Safe recovery requires two consecutive settlements; a relapse before recovery cannot incur another fine. Chapter-wide new/migrated playthroughs and all later releases remain required before the expansion is complete.

The first successfully migrated serialized save is retained in the same storage root under `migrationBackups[slot]`. Later migrations never replace that backup. Invalid imports change neither the campaign nor its backup. Only an explicit reset clears that slot's backup, including resets without an idempotency receipt. Other slots and the Mosslight namespace are untouched.
