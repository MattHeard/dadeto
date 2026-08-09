# Stripe billing changeset 1

- Unexpected hurdle: Terraform is not installed in the local runner, so infrastructure formatting and validation could not run.
- Diagnosis: the repository already has separate project-level provisioning and ephemeral `t-*` environments; secret containers must be stable and shared rather than per ephemeral environment.
- Chosen fix: provision stable test/live Secret Manager containers only from the project-level environment, bind functions to explicit numeric versions, and use a manually triggered stdin-based rotation workflow.
- Next-time guidance: install/use the repository's Terraform validation environment before closing the full five-changeset goal; add Stripe API-key binding when the checkout function deployment surface is introduced.
