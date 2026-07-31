# Ledger storage report mutant

- **Unexpected hurdle:** The full mutant finder initially selected large or slow files, but a later full-suite run reached the new ledger storage toy and found seven survivors.
- **Diagnosis path:** Compared the surviving mutation locations with the storage-view tests and found that the report's empty `duplicateReports` and `errorReports` arrays were not asserted.
- **Chosen fix:** Added explicit empty-array assertions to the storage-view test; a full Jest/Stryker rerun killed both array mutants.
- **Next-time guidance:** Keep the full-suite finder for survivor discovery, then use the mutation location and the nearest public report assertion to add the smallest behavioral contract test.
