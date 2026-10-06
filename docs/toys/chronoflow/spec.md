# Toy Spec — Chronoflow

## Summary

- Toy name: Chronoflow — The Tidal Archive
- Owner: Dadeto
- Last updated: 2026-10-06

## Problem Statement

- Build an original 2D puzzle game where players route water through a compact mechanical archive. Water has momentum, pressure, viscosity, and buoyancy; gates and sluices change with a globally synchronized tide phase. The player solves spatial flow puzzles while learning to anticipate a shared clock.
- The tone combines the quiet ecological exploration of Mosslight Valley with the vivid, high-contrast interface and readable systems of Neon Covenant. Characters, setting, art, story, and mechanics remain original.

## Boundary

- One deterministic simulation powers an embedded Dadeto toy and a dedicated responsive game page. Fluid evolution and puzzle rules are pure core logic. Rendering/input, persistent save storage, and Internet clock access stay behind adapters.
- Network time is the authority for tide phase and timed puzzle windows. Browser wall-clock time (`Date.now`, `new Date()` without an injected value, or equivalent) must never determine simulation or puzzle state.

## Scope

- In scope: a compact tile grid; water source and target; editable gates, channels, pumps, and drains; visible fluid depth/velocity; pressure-driven flow; fixed-step deterministic updates; authored solvable levels; a server clock endpoint; clock offset/uncertainty estimation; reconnect and stale-clock states; keyboard, touch, and gamepad input; pause and untimed offline practice; save/export; embedded and full-page presentation.
- Out of scope for the first release: multiplayer fluid interaction, account-backed saves, user-created levels, unsupervised realtime leaderboards, and sub-cell CFD intended for engineering use.

## Actors and Interfaces

- Primary actors: the player, the archive keeper Ilyra, and the tide mechanism called the Orrery.
- Inputs: select/edit a cell, rotate a channel, toggle a gate, prime a pump, reset, pause, and inspect a cell. Equivalent keyboard, touch, gamepad, and embedded toy controls must call the same commands.
- Outputs: a pixel-art 2D board, animated water surface and flow direction, pressure/volume readouts, current trusted tide phase and synchronization quality, level result, and portable save data.
- Player loop: inspect the target route; observe current water and tide; make a small number of reversible edits; let fixed simulation steps run; use a tide window to deliver the required volume without overflowing the archive; inspect the result and unlock the next level.

## Simulation and Puzzle Rules

- The first implementation uses a bounded regular grid (initial target 32×20 cells) with quantized water volume, horizontal/vertical velocity, and obstacle/material fields. A fixed-step, deterministic solver applies gravity, pressure projection, viscosity/damping, boundary constraints, sources, drains, and gates. No wall-clock reads or unseeded randomness are allowed in this layer.
- Use a stable grid-based incompressible-flow approximation: semi-Lagrangian velocity advection, pressure solve/projection, and bounded face fluxes. This aims for convincing puzzle-scale flow and mass conservation, not scientific-grade CFD. Solver constants, iteration counts, and level geometry are versioned inputs.
- Each step preserves water mass except at declared sources, drains, evaporation rules, and overflow. A debug/test invariant compares total volume before and after each step. Fixed iteration order and numeric precision produce repeatable snapshots for a given initial state and command stream.
- A level defines its grid, materials, source schedule, target region, required delivered volume, overflow limit, edit budget, tide schedule, and a known solution witness. Authored levels must include a deterministic solution replay; the solver itself does not promise arbitrary-level solvability.
- A puzzle command changes the board only at a fixed simulation-step boundary. Tide phase is derived from synchronized server epoch time and level schedule. The simulation receives that phase as explicit input; it never asks for current time.
- Rendering interpolates between adjacent simulation states only. It cannot mutate solver or puzzle state.

## Internet Clock and Resilience Contract

- A same-origin Dadeto endpoint returns trusted Unix epoch milliseconds and a server-generated response timestamp over HTTPS. The browser samples request start/end using `performance.now()` and estimates offset from the response; midpoint sampling and round-trip duration yield an uncertainty bound. Local wall time is not used at any point.
- A monotonic clock may measure request duration and elapsed time since a valid server sample. It only advances an estimate anchored to server time; it is never a standalone epoch or authority. Clamp/resample when latency, drift, sleep/resume, or clock uncertainty exceeds the documented threshold.
- Timed levels are playable only while the estimate is fresh and uncertainty is below the level limit. If sync expires, pause tide-driven simulation and clearly explain the state. The player may continue in an untimed practice copy, which cannot earn a timed completion.
- Offline launch permits saved levels in untimed practice. It must not synthesize Internet time from the device clock, silently score timed actions, or corrupt the last valid save. Reconnect re-samples server time before timed play resumes.
- Save data includes schema and solver/rules versions plus board edits and completion records. It excludes a trusted current time; the next session must obtain a fresh network sample.

## Assumptions and Constraints

- Assumptions: the full page can reach a same-origin time endpoint; the browser supports Canvas 2D and a monotonic high-resolution timer; authored levels keep solver cost bounded.
- Constraints: embedded and full-page adapters use the same runtime and puzzle rules; fixed-step simulation is deterministic; network/UI effects are injected; no browser wall-clock access in core; target 60 fps on a modest desktop and playable 30 fps on mobile for the initial grid.

## Dependencies

- Internal dependencies: Dadeto browser toy persistence, shared game canvas/input presenters where useful, local and cloud function adapter patterns, and the mandatory docs/toys harness.
- External dependencies: Dadeto-hosted HTTPS clock endpoint; no third-party time API or runtime fluid-simulation package in the initial build.

## Bounded Milestones

1. **Design contract (this loop):** lock solver, puzzle, clock, offline, and quality boundaries in these four docs.
2. **Fluid core proof:** implement a small deterministic grid solver, mass/bounds invariants, and a single replayable channel level; no network or presentation yet.
3. **Playable vertical slice:** wire a responsive board and commands to the shared solver; complete one level in the full page and embedded toy, with save/restore.
4. **Trusted-time vertical slice:** add the same-origin server endpoint, browser sync adapter, visible uncertainty/stale states, a tide-gated level, and untimed offline practice.
5. **Content and hardening:** add authored levels/solution witnesses, accessibility and touch/gamepad polish, sync failure playthroughs, and full aggregate acceptance.

After each milestone, update the owning beads from the measured implementation rather than assuming all later milestones remain unchanged.
