# THREEFOLD rat encounter restoration

- Unexpected hurdle: the saved rat encounter lived on a divergent rescue branch; bringing it across as a broad cherry-pick conflicted with the active branch's later simulation, save, renderer, and documentation work.
- Diagnosis: the active branch had the rescued Latchfolk and episode outcomes but no encounter module or rat state. I checked the branch-specific state and translated only the bounded encounter contract into the active architecture.
- Fix: add one authored rat, in-range fight/bypass actions with scale-dependent outcomes, save schema-v2 state with v1 migration, Mosslight prompt/rendering, focused tests, and aligned toy docs.
- Next-time guidance: inspect branch ancestry and current state before importing a whole commit from a divergent prototype branch. Keep rat death by growth and multiple-creature fate resolution as separate follow-up acceptance work.
