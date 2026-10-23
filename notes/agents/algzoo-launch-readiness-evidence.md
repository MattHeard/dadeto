# AlgZoo launch-readiness evidence

- Hurdle: `launchReady` was derived from only two canary-denial booleans, so it could be true with no access-log artifact or prompt-exposure checks.
- Diagnosis: the frozen protocol requires control and future-canary denial, evidence that canary and held-out content did not reach investigator prompts, and preserved raw logs with hashes. Existing configuration carried an unused null artifact field.
- Fix: readiness now requires four explicit passed checks, a nonempty log-artifact reference, and a SHA-256 value; otherwise the plan stays `prelaunch-not-launched` and is not marked ready. Tests exercise each missing/false field and malformed digest.
- Next time: the harness checks completeness and syntax only. Before launch, retrieve the real provider/service logs, verify the artifact hash, inspect prompt exposure, and then populate the manifest; never treat synthetic fixture values as evidence.
