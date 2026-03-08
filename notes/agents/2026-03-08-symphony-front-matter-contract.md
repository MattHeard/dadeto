# Agent Retrospective: Symphony front matter contract

- **Unexpected hurdle:** the local Symphony loader was still mixing a bullet-scraped operator surface with a separate config assumption, so `WORKFLOW.md` was not yet the single contract the bead expected.
- **Diagnosis path:** inspected `src/local/symphony/workflow.js`, compared the loader shape against the bead language and local scaffold tests, then validated that `HEAD` already carried the intended contract change in commit `e6b2cdcf7`.
- **Chosen fix:** kept the workflow definition centered on `{ config, prompt_template }`, parsed flat typed front matter values from `WORKFLOW.md`, and preserved the derived operator-facing arrays (`allowedCommandFamilies`, `requiredQualityGates`, `handoffRequirements`) for the existing local status surface.
- **Next-time guidance:** if nested YAML or richer workflow schemas become necessary, split that into a follow-up bead instead of widening the current local-first loader contract.
