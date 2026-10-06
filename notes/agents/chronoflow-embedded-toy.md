# Chronoflow embedded toy adapter

- Unexpected hurdle: the generic toy lifecycle calls a synchronous function per submit, while Chronoflow’s page controls advance a persistent in-memory runtime.
- Diagnosis: the generic `canvas-2d` presenter can already render primitive shapes, and command streams make deterministic state reconstructible without device time or ambient module state.
- Fix: add a synchronous adapter that replays explicit commands through the shared Chronoflow runtime, draws the 5×4 solver board with Canvas 2D shapes, and returns the solver snapshot. Register CHRO1 with the existing text-input/canvas output modes; embedded runs are practice only.
- Next-time guidance: keep time authority in the full-page network-clock adapter. Any embedded persistence or input side effects must stay injected and must never synthesize timed credit.
