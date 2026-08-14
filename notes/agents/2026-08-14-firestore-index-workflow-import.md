# Production Firestore field-index workflow import

- Unexpected hurdle: the `google_firestore_field` resource and its Terraform configuration were already present, but `gcp-prod.yml` imported only composite indexes; the aggregate gate also exposed unrelated Stripe fixture, JSDoc plugin, duplication, and core-parse failures.
- Diagnosis path: Error Reporting showed an open `prod-render-tree-weights` group with three `FAILED_PRECONDITION` events for the `variants.targetTreeWeightsDirty` collection-group query. The Terraform resource correctly models a single-field override, and the provider resource name is imported under `collectionGroups/{collection}/fields/{field}`.
- Chosen fix: import `google_firestore_field.variants_tree_weights_dirty[0]` into production Terraform state before planning, and update the workflow-selection test to the named restore database.
- Next-time guidance: when a single-field index is declared with `google_firestore_field`, add an explicit field-resource import to production state adoption; run Terraform validation in the GCP workflow because local Terraform validation is intentionally blocked.
