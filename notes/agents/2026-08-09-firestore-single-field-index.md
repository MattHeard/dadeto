# Firestore single-field index Terraform fix

- Unexpected hurdle: the repository quality check could not spawn its nested Node processes (`EPERM`), and the Terraform CLI is not installed in the environment.
- Diagnosis path: the GCP error identified `variants.targetTreeWeightsDirty` as a collection-group single-field query; Terraform was declaring it with `google_firestore_index`, which calls the composite-index API and was rejected by Firestore.
- Chosen fix: model the field with `google_firestore_field` and an `index_config` collection-group ascending entry, matching the existing `pages_number` pattern.
- Next-time guidance: run `terraform -chdir=infra validate` and `npm run check` in a normal CI/developer environment with Terraform installed and process spawning permitted.
