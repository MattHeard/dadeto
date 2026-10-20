# THREEFOLD sluice puzzle model

- Unexpected hurdle: the existing Broken Gate intentionally keeps flooding as a deterministic visual consequence; wiring the new hydraulic solver there would widen this slice and change the first episode's contract.
- Diagnosis: the THREEFOLD spec places fluid simulation in the broader small-world milestone and explicitly treats the Torricelli solver as a foundation for a separate cross-scale puzzle.
- Chosen fix: added a pure two-chamber sluice model that reuses the physical water solver. The service valve is available at scale −2, explicit elapsed seconds advance flow, and the lower crossing requires its water surface to reach 0.3 metres and Mara to be at scale −1 or larger.
- Verification: focused water and puzzle tests passed 2 suites / 19 tests; `npm run build` passed; `npm run check` passed all 10 gates with five serial impact shards covering 962 suites / 6,660 tests, zero clones, and zero audit vulnerabilities. Exact-head GitHub Full Check is pending.
- Next-time guidance: integrate this state into a separate player-visible small-world scene, then add input, water rendering, and save/import coverage. Keep the Broken Gate flood visual-only.
