# Remaining injected fetchImpl AllowEffects boundaries

- **Unexpected hurdle:** The first aggregate check caught a parse-not-validate violation: a runtime guard had been added for the new OpenAI transport dependencies.
- **Diagnosis:** The core parse gate classified the dependency guard in `exchangeRealtimeCallSdp` as validation. The nominal JSDoc contract and compiler-backed capability rule already enforce the required boundary.
- **Fix:** Removed the redundant runtime guard, retained required permission-aware types and boundary-owned permissions, and covered Chronoflow clock/config, OpenAI Realtime, and Notion API transport forwarding.
- **Next time:** Let type and capability diagnostics enforce dependency contracts; keep runtime parsing/validation at actual external data boundaries.
