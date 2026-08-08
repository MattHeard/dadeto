# Gate utilities coverage

- Unexpected hurdle: the existing suite covered only the standard gate evaluator and left every low-level adapter/helper partially untested.
- Diagnosis: spawn outcome normalization, signal handling, command delegation, and small value helpers were all outside the original test surface.
- Fix: added direct tests for each exported helper and each launch/result outcome.
- Next-time guidance: for utility modules, enumerate exported functions first and test their independent contracts before relying on a higher-level integration suite.
