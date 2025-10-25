# Generate stats re-export cleanup

- **Challenge:** Follow-up review flagged that the generate-stats core bridge did not actually need to re-export the shared bucket constant, so the prior change added unnecessary surface area.
- **Resolution:** Removed the redundant re-export while keeping the shared import so downstream logic still uses the shared default bucket name.
