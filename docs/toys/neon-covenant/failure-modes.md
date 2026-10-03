# Neon Covenant Failure Modes

## Initial Predicted Failure Classes

Save identity collision, corrupt ledgers, menu input leaking into dialogue, heat bottlenecks mistaken for stalled research, and touch taps lost between frame ticks.

## Detection Signals

Mosslight progress appears in the lab, malformed import throws during rendering, unreadable or immediately dismissed introduction, or shift costs advance while merely exploring.

## First-Response Playbook

Export progress before resetting. Run focused game tests. Inspect `lab`, `world`, `dialogue`, `menu`, and `lastActions` through `neon_observe` or the save export. Verify costs change only with the explicit shift command.

## Promoted from Real Failures

The shared engine initially hard-coded content-specific creation and saves. Episode factories and a save profile now establish the separation; regression tests retain default Mosslight behavior.
