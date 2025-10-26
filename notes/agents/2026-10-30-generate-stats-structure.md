# Generate stats structure follow-up

- **Challenge:** Aligning the generate stats Cloud Function with the new bridge pattern meant untangling direct GCF imports from the entry point without breaking the existing initialization flow.
- **Resolution:** Extended the GCF bridge to expose every runtime dependency, updated the index to consume only the bridged exports, and wired the copy script so infra receives the shared core files required by the new layout.
