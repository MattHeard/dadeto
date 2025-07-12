# Infrastructure Code

This directory houses Terraform configurations and related resources for deploying cloud infrastructure.

## Import Targets

The `import_targets.json` file lists any existing resources that should be
imported into the Terraform state. Each entry specifies the Terraform resource
address and the corresponding ID of the resource to import.
