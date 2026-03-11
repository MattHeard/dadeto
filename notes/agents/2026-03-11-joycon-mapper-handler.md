# Joy-Con mapper handler complexity loop

- **Unexpected hurdle:** The handler still reported a complexity violation even after pulling button handlers into helpers, while the new helpers and cleanup helpers needed fresh JSDoc descriptions and `no-ternary` rewrites before lint would succeed.
- **Diagnosis:** Walked through `joyConMapperHandler` to identify the three inline `.forEach` loops plus the interval/RAF wiring that were counting toward the complexity metric, then inspected the helper ESLint pilots that flagged `no-ternary` and missing docs.
- **Taken fix:** Introduced reusable helpers for appending nodes, disposing callbacks, scheduling the capture interval, and queuing the initial sync, relocated the loops outside the handler, rewrote the skip helper to avoid ternaries, and added explanatory JSDoc text.
- **Next time:** Push iterative logic into dedicated helpers before touching the handler body and run `npm run lint` as soon as new helpers land so any dependent warnings surface before collecting final evidence.
