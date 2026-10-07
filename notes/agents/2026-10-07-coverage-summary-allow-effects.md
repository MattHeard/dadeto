# AllowEffects for coverage summary writes

- Unexpected hurdle: adding an async permission boundary could have changed the command's existing synchronous read-error behavior.
- Diagnosis: the handler reads and validates local coverage data synchronously, then performs exactly one injected write.
- Fix: keep the handler itself non-async so read failures still throw immediately, and return the boundary promise only after summary construction.
- Next: continue the remaining injected file/process effect inventory; wrapper-owned filesystem calls such as directory setup are not injected core callbacks.
- Verification: focused suite asserts permission forwarding and preserves read-error behavior; aggregate check evidence is recorded in Beads.
