# THREEFOLD Failure Modes

## Initial Predicted Failure Classes

- Setup/configuration mismatch: page source exists but the build did not copy the standalone route or core modules.
- Invalid or missing inputs: unsupported action names or malformed imports reach the simulation boundary.
- Dependency/service unavailable: localStorage is denied or quota-limited.
- Non-deterministic timing or ordering: wall-clock callbacks accidentally advance crisis time, or simultaneous controls apply in different orders.
- Environment-specific behavior: pointer capture, gamepad polling, canvas support, or browser storage differs on mobile.
- Growth-preview drift: the highlighted geometry differs from committed rubble, previewing mutates simulation state, or the warning prevents a deliberate growth action.
- Occupant-preview drift: the Latchfolk is highlighted without a matching saved loss, growth from inside their bounds at scale −2 kills them without a preview, or safe/lost/closed/locked-growth states keep showing a lethal warning. Do not apply geometry's newly-intersected rule to living occupants: the proposed grown body can overlap an occupant already entered at a smaller scale.
- Interaction regression: a ferry rescue or Latchfolk warning is accepted out of range, after surge, or is lost after save/import; one ferry interaction rescues both passenger groups, partial rescue is misreported at surge, or withdrawal succeeds from outside the road's interaction range.
- Withdrawal regression: the storm clock does not settle to aftermath, prior rescues/warnings are erased, or new world actions remain available after departure.
- Late-repair regression: the locking pawl repairs an intact gate, accepts a pre-surge/out-of-range/wrong-scale action, leaves repaired gate geometry as rubble, restores ferry or resident losses, or fails to drain lower water by aftermath.
- Closure regression: the destroyed signal station still files a report, the intact station cannot close by report after aftermath, or destroying the station also blocks departure through the upland road; closure method or station rubble is lost after save/import.

## Detection Signals

- Error signatures/log lines: browser module import errors, an invalid-save message, or a failed storage operation.
- Observable symptoms: blank frame; actions ignored; tide meter disagrees with crisis progress/stage; crisis stage changing while paused; run returning to the opening state after reload.
- Observable symptoms: fight/bypass prompt appears outside the rat's range or at an unsupported scale; A grows instead of fighting or X waits instead of bypassing while the rat is in reach; a resolved rat reappears after reload.
- Passenger/ferry state disagrees with the in-range rescue action or deterministic surge transition.
- Partial passenger state is rejected by save import, overwritten at surge, or rendered without distinguishing the rescued group from the group still aboard or lost.
- Latchfolk are safe without a pre-surge warning, or a warning changes ferry/passenger outcomes.
- Mara is marked withdrawn before reaching the upland road, or can still change the world after withdrawal.
- Gate repair is recorded without a lost ferry and forced-open gate, or any ferry/passenger/Latchfolk loss changes after repair.
- Signal-station rubble, report availability, or the post-storm closure route disagrees with the saved geometry and episode closure branch.
- Failing commands: focused Jest path in `harness.md`, `npm run build`, or `npm run check`.

## First-Response Playbook

1. Capture the exact browser action or command and its output.
2. Check generated route files before investigating the renderer.
3. Verify simulation reducers without the page, then check input adaptation and storage injection separately.
4. Keep crisis progression on explicit game commands; pause, menu, and accessibility operations must remain inert.
5. Add a regression test and update this playbook after a failure recurs or reveals a new boundary.
6. For interaction failures, verify target identity, range and eligibility independently from input mapping and save normalization; then check that episode outcomes resolve independently at surge, late repair, withdrawal, or post-storm closure.

## Rat encounter checks

- Confirm the rat fate is `present`, Mara is at scale −2 or −1, and her canonical position is inside the authored interaction radius before expecting fight/bypass controls.
- A should repel the rat at −2 and kill it at −1; X should bypass it at either scale. Both outcomes advance the game clock, while only fighting suppresses Anchor recovery for that action.
- Verify complete-run schema-v1 migration defaults the rat to `present`, while schema-v2 rejects missing or unknown rat fates.

## Promoted from Real Failures

- Date: 2026-10-16
- Failure observed: the managed workspace rejected report writes with EROFS during the previous THREEFOLD loop.
- Root cause: the default sandbox exposed the checkout read-only while evaluators needed to write reports.
- Fix implemented: rerun artifact-producing checks with reviewed elevated access.
- Guardrail added (test/doc/harness): use the full check log and coverage summary as explicit evidence; do not treat EROFS as a code failure.
