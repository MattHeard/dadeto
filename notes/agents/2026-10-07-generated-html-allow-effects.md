# AllowEffects for generated HTML writes

- Unexpected hurdle: the build core had no permission boundary around its injected synchronous filesystem writer, including its formatting-error fallback.
- Diagnosis: inspected both success and fallback paths and found they shared a generic `writeFile` callback with no token contract.
- Fix: typed the injected writer with `AllowEffects`, injected a runtime boundary into the core factory, and wrapped each actual write. The build entrypoint supplies the local boundary adapter.
- Next: migrate the remaining injected filesystem and process effects from the AllowEffects inventory, using compiler diagnostics to identify call sites.
- Verification: focused writer tests cover formatted and fallback writes and assert permission forwarding; full repository gates and build recorded in the owning Beads issue.
